# Datastore Exception Tagging Process

## Overview

After an exception has been submitted and approved via the [Public Access Exception Policy](./Public-Access-Exception-Policy.md), an exception tag must be applied to the datastore to allow appropriate access to persist without public access blocks enforced.

This manual approval process works in conjunction with the [automated public access block](../Tools/CloudCustodian/README.md) policy enabled via Cloud Custodian. When configured, the Cloud Custodian policy will _not_ apply public access blocks to buckets with the `public-exception` tag applied.

## Process Steps

1. Using the Console or CLI, add a tag to the Datastore resource (S3 bucket, Azure blob, etc.) using the following parameters:
   - **Key**: `public-exception`
   - **Value**: ISO-formatted date for when the exception was approved and the ID of the ticket where the exception was approved (e.g. YYYY-MM-DD - e.g. `2020-12-31 SECEXP-123`)
1. For AWS buckets, add the bucket to the configuration for the [S3 Secrets Scanner](../Tools/s3-secrets-scanner/README.md) to enable routine bucket scanning for secrets

### Exception Removal

To remove an expired or revoked exception, remove the tag applied in the above process, and update the configuration for the [S3 Secrets Scanner](../Tools/s3-secrets-scanner/README.md) to disable scanning
