## Variables
variable "profile" {
  description = "Name of AWS profile to use"
  type        = string
  default     = "default"
}

variable "region" {
  description = "Name of region to apply changes to"
  type        = string
  default     = "us-east-1"
}

variable "buckets" {
  description = "List of bucket names for buckets to apply an event hook for scanning"
  type        = list(string)
  default     = []
}

variable "lambda_filename" {
  description = "Name of region to apply changes to"
  type        = string
  default     = "s3-secrets-scanner.zip"
}

variable "tags" {
  description = "Set of tags to apply to created resources"
  type        = map
  default = {
    Owner = "security@company.com"
  }
}

## Resources
provider "aws" {
  profile = var.profile
  region  = var.region
  version = "2.63.0"
}

# SQS Queue
resource "aws_sqs_queue" "s3_events_queue_deadletter" {
  name_prefix                = "S3-SecretsScanner-DeadLetters"
  delay_seconds              = 0
  visibility_timeout_seconds = 30
  message_retention_seconds  = 1800
  max_message_size           = 262144
  receive_wait_time_seconds  = 20

  tags = var.tags
}

# SQS Dead-letter Queue
resource "aws_sqs_queue" "s3_events_queue" {
  name_prefix                = "S3-SecretsScanner"
  delay_seconds              = 0
  visibility_timeout_seconds = 360
  message_retention_seconds  = 345600
  max_message_size           = 262144
  receive_wait_time_seconds  = 20

  redrive_policy = "{\"deadLetterTargetArn\":\"${aws_sqs_queue.s3_events_queue_deadletter.arn}\",\"maxReceiveCount\":3}"

  tags = var.tags
}

# IAM Policy for SQS Queue, allowing access only from configured buckets
data "aws_iam_policy_document" "sqs_queue_policy" {
  version   = "2012-10-17"
  policy_id = "S3-SecretsScanner-Policy"
  statement {
    sid    = "Allow Specific Buckets Access"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["*"]
    }
    actions = [
      "sqs:SendMessage"
    ]
    resources = [
      aws_sqs_queue.s3_events_queue.arn
    ]
    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = data.aws_s3_bucket.configured_buckets.*.arn
    }
  }
}

resource "aws_sqs_queue_policy" "sqs_queue_policy" {
  queue_url = aws_sqs_queue.s3_events_queue.id

  policy = data.aws_iam_policy_document.sqs_queue_policy.json
}

# IAM Policy for Lambda
data "aws_iam_policy_document" "iam_for_lambda_policy" {
  version = "2012-10-17"
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole"
    ]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "iam_for_lambda" {
  name_prefix = "S3-SecretsScanner-LambdaRole"
  description = "Allows Lambda to access contents of S3 buckets for secrets scanning and notification."

  assume_role_policy = data.aws_iam_policy_document.iam_for_lambda_policy.json

  tags = var.tags
}

locals {
  iam_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole",
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::aws:policy/service-role/AWSLambdaRole",
    "arn:aws:iam::aws:policy/AmazonSQSFullAccess"
  ]
}

resource "aws_iam_role_policy_attachment" "iam_roles_attach" {
  role       = aws_iam_role.iam_for_lambda.name
  count      = length(local.iam_policy_arns)
  policy_arn = local.iam_policy_arns[count.index]
}

# Lambda function
resource "aws_lambda_function" "s3_secrets_scanner" {
  filename         = var.lambda_filename
  source_code_hash = filebase64sha256(var.lambda_filename)
  function_name    = "S3-SecretsScanner-${random_id.id.hex}"
  description      = "Receives S3 object events and scans the object in question for secrets."
  role             = aws_iam_role.iam_for_lambda.arn
  handler          = "index.handler"

  timeout     = 15
  memory_size = 256

  runtime = "nodejs12.x"

  environment {
    variables = {
      NOISE_THRESHOLD         = "5",
      MINIMUM_ALERT_THRESHOLD = "medium",
      CONTEXT_LINES           = "5",
      CONTEXT_LINE_MAX_LENGTH = "100",
      SQS_ALERT_URL           = "https://sqs.us-west-2.amazonaws.com/455628517073/hive-alerts"
    }
  }

  tags = var.tags
}

resource "random_id" "id" {
  byte_length = 8
}

resource "aws_lambda_event_source_mapping" "sqs_to_lambda_notification" {
  event_source_arn = aws_sqs_queue.s3_events_queue.arn
  function_name    = aws_lambda_function.s3_secrets_scanner.arn
}

resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name_prefix       = "/aws/lambda/S3-SecretsScanner"
  retention_in_days = 14

  tags = var.tags
}

resource "aws_s3_bucket_notification" "bucket_notification" {
  count  = length(data.aws_s3_bucket.configured_buckets)
  bucket = data.aws_s3_bucket.configured_buckets[count.index].id

  queue {
    queue_arn = aws_sqs_queue.s3_events_queue.arn
    events    = ["s3:ObjectCreated:*"]
  }
}

data "aws_s3_bucket" "configured_buckets" {
  count  = length(var.buckets)
  bucket = var.buckets[count.index]
}

output "account_region" {
  value = concat([var.profile, var.region])
}

output "bucket_arns" {
  value = data.aws_s3_bucket.configured_buckets.*.arn
}
