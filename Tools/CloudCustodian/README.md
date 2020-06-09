# Cloud Custodian

## Overview

[Cloud Custodian](https://cloudcustodian.io/) is an [open-source](https://github.com/cloud-custodian/cloud-custodian), real-time cloud monitoring and compliance tool. It has the ability to notify and/or enforce security policies on the resources it monitors.

Cloud Custodian is used by the security team to identify resources that are not compliant with security or company policies. These policies include identifying resources that impact the company both from a security and cost perspective.

## Deployment

See deployment instructions on [cloudcustodian.io/docs](https://cloudcustodian.io/docs/deployment.html) site.

### Policies and Lambdas

The bucket brigade project uses Cloud Custodian to enforce public access blocks and ownership requirements for S3 buckets. The following policies and lambdas are available to add to your Cloud Custodian policy set:

#### Owner Tagging

To support the [Cloud Tagging Policy](../Documents/Cloud-Tagging-Policy.md), the following policies attempt to simplify tagging enforcement:

- [Automated Bucket Owner Tagging](./Automated-Bucket-Owner-Tagging.yml) policy attempts to auto-tag buckets with owners (when an "Owner" tag is not explicitly provided) by harvesting user information from an email address in the payload of the CloudTrail event. Customize the `value` parameter, in the `filters` block to specify the email domain to use.

- [Automated Removal of Untagged Buckets](./Automated-Removal-of-Untagged-Buckets.yml) policy tags any bucket without an "Owner" tag for automated removal after one hour if an "Owner" tag is not added. The default action is `delete`, but the policy can be further configured to `notify` when deployed to regions where a "delete" operation may be too aggressive.

#### Public Access Blocks

To support the [`public-exception` requirement](../../Documents/Public-Access-Exception-Policy.md), the following policy enforces public access block for non-exempt buckets

- [Automated-Public-Access-Blocks](./Automated-Public-Access-Blocks.yml) policy enables the "Block public access to buckets and objects granted through any access control lists (ACLs)" for buckets that have not been tagged with a `public-exception` tag, using the [c7n-s3-public-block](./c7n-s3-public-block.py) lambda
