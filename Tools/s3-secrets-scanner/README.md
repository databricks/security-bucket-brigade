# S3-Secrets-Scanner

Lambda function to scan objects uploaded/modified in S3 buckets for secrets. Objects are scanned as they are uploaded, in near real-time against a set of secrets definitions, driven by regular expression pattern matching.

By design, this function does not scan all objects. It excludes objects larger than a certain size and certain object paths, both configurable. To configure the maximum size, use the `MAX_SIZE_MEGABYTES` environment variable. To configure the excluded object paths, update the `rules.json`, adding regular expressions to the `FileBlacklist` array that should be skipped when matched. _Note that object keys ending with a `/` are not scanned._

---

IMPORTANT: AWS Lambda has a limit for the `/tmp` directory size that restricts the max individual file size that can be assessed. If scanning files larger than `500 MB` is required, a different approach should be adopted.

---

The scanning approach and outputs are inspired by the open-source [YAR tool](https://github.com/Furduhlutur/yar).

Setup: _This Lambda is designed to be triggered by AWS SQS, which has been configured to receive AWS S3 bucket events._

## Deployment

Deployment to AWS using Terraform, see [`terraform-deploy`](./terraform-deploy/README.md)

## Usage

- The Lambda will run automatically each time an object is uploaded or modified
- Findings are returned in JSON format and captured in CloudWatch
- Optionally an alert queue URL can be specified to send notifications when secrets are found _(see "Environment Variables")_

## Lambda preparation

- Zip the root level, upload to AWS Lambda
- Environment variables can be setup per the below section

## Environment Variables

The following environment variables can be optionally configured:

- `MAX_SIZE_MEGABYTES`: Sets the maximum file size that the function will scan - note this cannot exceed the size of the Lambda environment temporary file store _(`512 MB` as of [2020-03-11](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html))_ (defaults to `100`)
- `CONTEXT_LINES`: Sets the number of lines in the context output (default to `5`, minimum is `3`) - context lines include the secret itself (e.g. 3 lines includes the line before the secret _(if present)_, the line containing the secret, and the line after the secret _(if present)_)
- `CONTEXT_LINE_MAX_LENGTH`: Reduces the output by restricting the number of characters on each context line to the provided value - if set to zero, no truncation will occur (defaults to `100` characters)
- `NOISE_THRESHOLD`: Sets minimum "noise" value for rule evaluation in the `rules.json` file. Rules below this threshold will be ignored. If `SQS_ALERT_URL` is configured _(see below)_, this will impact the severity value of the alert sent. Relative severities will be computed from the threshold level:

  Severities are relative to the threshold. There are `4` possible severities: `high`, `medium`, `low` and `info` (informational). The threshold value is equivalent to an `info`, and all other severities are relative.

  For example, if the `NOISE_THRESHOLD` is `5` and the current rule noise is set to `3`, the relative distance from the threshold is `2`. Therefore, the severity of alerts with that value will be `medium` (since `medium` is two relative positions "above" `info`).

  Defaults to `5`. Computed severities relative to the noise value are:

  - `5`: `info`
  - `4`: `low`
  - `3`: `medium`
  - `2`: `high`
  - `1`: `high` _(all severities ≥ `3` from the threshold are `high`)_

- `SQS_ALERT_URL`: URL for SQS alerts - when configured, if secrets are found in one or more files, an alert will be sent per file.

  **Access Note:** The target SQS queue must be configured to allow `SendMessage` from wherever the function is running.

- `MINIMUM_ALERT_THRESHOLD`: If `SQS_ALERT_URL` is configured, this is the minimum computed severity _(see `NOISE_THRESHOLD` above)_ required to send an alert to the notification queue. Possible values are `high`, `medium`, `low` and `info` (defaults to `low`)

## License

Licensed under the [MIT license](./LICENSE.txt).
