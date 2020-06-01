# Solution Write-up

Many companies have a reason for the data in some S3 buckets to be public. However, much of the time data exposed publicly in S3 bucket results from accidental over-provisioning of access. When buckets are legitimately public, it is possible to inadvertently add non-public files.

The following multi-phase approach was adopted to determine whether existing public access had exposed any sensitive objects, a way to ensure public access was automatically blocked for buckets and objects moving forward except where appropriate, and a mechanism to monitor public resources real-time for secrets.

**_The phases below can largely be done in parallel, except where noted._**

**_Prerequisites_**

- Cloud asset management query and relationship graphing tool (such as [JupiterOne](https://jupiterone.com/) or Lyft's open source [Cartography](https://github.com/lyft/cartography)) configured with connectivity to AWS accounts for asset queries
- [Cloud Custodian](https://cloudcustodian.io/docs/index.html?button=documentation) integrated with AWS accounts

**_Phases_**

1. [Identify ownership for all buckets](#phase-1:-identify-ownership)
1. [Identify what's already public / possibly exposed](#phase-2:-triage:-identify-/-classify)
1. [Scan legacy stuff for secrets](#phase-3:-scan-existing-buckets)
1. [Automate blocking public access](#phase-4:-automate-public-access-blocks)
1. [Setup alerts for blocking bypass](#phase-5:-alert-for-policy-violations)
1. [Automate continuous scanning of public resources](#phase-6:-scan-public-buckets-ongoing)

## Phase 1: Identify Ownership

### Details

While attempting to determine whether public access to S3 buckets is valid, or attempting to make modifications to improperly configured S3 buckets, ownership information is essential. In the absence of owner information, making some necessary changes or understanding if changes should be made at all, is challenging.

Subsequent phases for action on impacted resources can begin in parallel to this phase, but in many less-critical cases, forward action may only be possible with a clear owner.

### Steps

1. Publish [Cloud Tagging Policy](./Cloud-Tagging-Policy.md)

1. Find buckets without owners:

   _This step will help inform the communications efforts in the following steps, and can be used to track progress toward the standards set._

   Using your selected cloud asset management tool, query AWS S3 buckets that do not have required owner tagging. The following sample query for JupiterOne using the [J1QL](https://support.jupiterone.io/hc/en-us/articles/360022722014-J1QL-Language-Specs) syntax can be adapted to related cloud asset management tools:

   ```sql
     FIND aws_s3_bucket
       WITH
         tag.Owner=undefined
       AS bucket
     RETURN
       bucket.bucketName AS Name,
       bucket.region AS Region,
       bucket.createdOn AS CreatedOn,
       bucket.tag.AccountName AS AWSAccount
   ```

1. [Notify leadership](../Communications/Tag-Enforcement-Leadership_Email-Template.md) of tagging requirement, and establish an implementation timeline for enforcement

1. [Notify users](../Communications/Tag-Enforcement-General_Email-Template.md) of tagging requirement, including the timeline for enforcement

1. Implement ["Automated Bucket Owner Tagging"](../Tools/CloudCustodian/Automated-Bucket-Owner-Tagging.yml) Cloud Custodian policy to automatically apply an "Owner" tag to untagged resources

1. Implement ["Automated Removal of Untagged Buckets"](../Tools/CloudCustodian/Automated-Removal-of-Untagged-Buckets.yml) Cloud Custodian policy to automatically remove buckets without identified owners

## Phase 2: Triage: Identify / Classify

_Pre-requisite: [Phase 1: Identify Ownership](#phase-1:-identify-ownership) - including publishing tagging and exception policies_

### Details

For existing buckets, it is important to identify whether any are already publicly exposed, possibly containing secrets. A response/triage team should be tasked with identify and classifying all buckets with public access.

### Steps

1. Identify your public buckets:

   Using your selected cloud asset management tool, query AWS S3 buckets that are configured with public access. The following sample query is provided for JupiterOne:

   ```sql
    FIND UNIQUE aws_s3_bucket
      WITH
        (
          BlockPublicAcls != true OR
          IgnorePublicAcls != true OR
          BlockPublicPolicy != true OR
          RestrictPublicBuckets != true
        )
      AS bucket
      THAT ALLOWS AS grant (everyone|aws_authenticated_users) AS user
    RETURN
      bucket.bucketName AS BucketName,
      grant.permission AS Permission,
      user.displayName AS Audience,
      bucket.region AS BucketRegion,
      bucket.owner AS Owner,
      bucket.createdOn AS CreatedOn,
      bucket.tag.AccountName AS AWSAccount,
      bucket.webLink AS Link
   ```

1. Triage:

   Review each identified bucket and determine with the owner (see [Phase 1](#phase-1:-identify-ownership) below) whether the bucket has a legitimate need to be public facing

1. Take the following action, depending on the triage outcome:

   - **Legitimately Public:** Add the tag key "`public-exception`" and set the value to the approval ticket number and date - e.g. "`SEC-1234 2020-05-01`" (per the [Public Access Exception Policy](./Public-Access-Exception-Policy.md))

   - **Not Public:** As appropriate, remove the statements or entire bucket policy that allow the bucket to be public; use the [Block public access (bucket settings)](https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html) to apply appropriate public access blocks for both the bucket and underlying objects

## Phase 3: Scan Existing Buckets

_Pre-requisite: [Phase 2: Triage: Identify / Classify](#phase-2:-triage:-identify-/-classify)_

### Details

Any buckets from the [previous step](#phase-2:-triage:-identify-/-classify), whether or not they were intentionally public, should be scanned for secrets to ensure that there are no existing non-public files present. If secrets are found, and appropriate incident should be created and the secret file should be expunged from the bucket.

### Steps

1. Scan existing buckets:

   Use the detailed steps in the [S3 Scan](../Tools/s3_scan/README.md) tool [README](../Tools/s3_scan/README.md) to scan existing buckets using EC2 instances

1. Backup / Remove non-public files:

   For any findings identified in the "Review the findings" step, backup (where appropriate) any non-public files, and then remove all versions of the non-public file

1. Start incident response:

   Create an incident, per your incident management process, to determine the impact of the exposure and take appropriate follow-up steps

## Phase 4: Automate Public Access Blocks

### Details

In order to prevent buckets from accidentally becoming public, use [Cloud Custodian](https://cloudcustodian.io/docs/index.html?button=documentation) to implement automation that automatically applies public access blocks for buckets not tagged with a public exception.

### Steps

1. Publish [Public Access Exception Policy](./Public-Access-Exception-Policy.md)

1. [Notify leadership](../Communications/Custodian-Public-Access-Block-Leadership_Email-Template.md) of tagging requirement, and establish an implementation timeline for enforcement

1. [Notify users](../Communications/Custodian-Public-Access-Block-General_Email-Template.md) of tagging requirement, including the timeline for enforcement

1. Add automated public access blocks:

   Implement ["Automated Public Access Blocks"](../Tools/CloudCustodian/Automated-Public-Access-Blocks.yml) Cloud Custodian policy to automatically apply public access blocks to S3 buckets without a `public-exception` tag

## Phase 5: Alert for Policy Violations

### Details

Implement alerting for policy violations.

The steps below use [JupiterOne's Alerts](https://jupiterone.com/features/rules-alerting/) functionality to both query for an alert on policy violations. For alternate query tools without integrated alerting, a simple wrapper can be used to run the query and send alerts based on the presence of misconfigured resources.

### Steps

1. Create an alert when public buckets are created without a `public-exception` tag:

   The following sample alert and query for JupiterOne can be adapted to related tools:

   - **Name:** "S3: Public Bucket Exposed with Exception"
   - **Severity:** "CRITICAL"
   - **Description:** "An S3 bucket has been found with unapproved public access. Remove inappropriate public access and follow-up with the bucket owner."
   - **Query:**

     ```sql
      FIND aws_s3_bucket
        WITH
            [tag.public-exception]=undefined AND
            (
              BlockPublicAcls != true OR
              IgnorePublicAcls != true OR
              BlockPublicPolicy != true OR
              RestrictPublicBuckets != true
            ) AS bucket
        THAT ALLOWS AS grant (everyone|aws_authenticated_users) as user
        RETURN
            bucket.bucketName AS BucketName,
            bucket.tag.AccountName AS AWSAccount,
            user.displayName AS Exposure,
            grant.permission AS Permission
     ```

     _Configure the alert mechanism to use your preferred method (email, Slack, Jira, Webhook, SQS, SNS, etc.)_

1. Create an alert when buckets are tagged with an unapproved `public-exception`:

   This process uses a validation step to ensure buckets are not tagged by end-users without approval. Alternatively, tagging can be restricted in your AWS environment, but the below allows for maximum permission for users.

   The following sample alert and query for[JupiterOne can be adapted to related tools:

   - **Name:** "S3: Bucket Tagged With Exception Without Approval"
   - **Severity:** "HIGH"
   - **Description:** "An S3 bucket has had a `public-exception` applied without approval. If approved, add the `exceptionVerified` property to the bucket. Otherwise, remove the tag and follow-up with the bucket owner."
   - **Query:**

     ```sql
      FIND aws_s3_bucket
        WITH
          exceptionVerified = undefined AND
          [tag.public-exception] != undefined
     ```

     _Configure the alert mechanism to use your preferred method (email, Slack, Jira, Webhook, etc.)_

## Phase 6: Scan Public Buckets Ongoing

### Details

Enable continuous scanning for secrets using the [S3-Secrets-Scanner](../Tools/s3-secrets-scanner) tool. The S3-Secrets-Scanner adds an S3 bucket event for all object create events, which triggers a lambda function via SQS to scan uploaded objects for secrets.

The S3-Secrets-Scanner can be deployed directly or using Terraform, see [`terraform-deploy`](../Tools/s3-secrets-scanner/terraform-deploy/README.md)

### Steps

1. Implement the [S3-Secrets-Scanner](../Tools/s3-secrets-scanner) using the "Deployment" and "Usage" in the [README](../Tools/s3-secrets-scanner/README.md)

1. _(Optional)_ Configure SQS alerting and connect SNS, Slack or other alerting tool
