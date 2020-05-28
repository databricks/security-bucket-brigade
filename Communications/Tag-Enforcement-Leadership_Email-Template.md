**From:** CISO

**To:** AWS Account Owners / Leadership

**Subject:** [IMPORTANT] Forced Tagging Requirement for AWS

**Message Body:**

---

**What:** New AWS S3 buckets without a required "Owner" tag will be _automatically **deleted**_\* via Cloud Custodian‡ _(see "What is Cloud Custodian"‡)_

**When:** `<enforcement date>`

**Where:** This policy will be effective for all AWS accounts, including production accounts\*

**Requested Actions:**

- Before `<notification date>`: Proactively confirm or provide feedback/concerns to `<Bucket Brigade Contact>` regarding the below policy regarding forceful removal of S3 assets that have not been tagged.
- Ensure the [Cloud Tagging Policy](../Documents/Cloud-Tagging-Policy.md) and timelines in this email have been communicated to teams who create or modify cloud resources.

**\* Enforcement Details**

- _New_ AWS S3 buckets with missing or non-compliant “Owner” tags will be automatically deleted via Cloud Custodian‡ if not tagged within one hour of creation. To ensure resources are not removed, add tags at the time of creation. Removed resources are not recoverable.

- _Existing_ AWS S3 buckets must maintain required tags. However, S3 buckets that have required tags removed after creation **will not** be automatically deleted. Previously identified owners will be contacted to re-tag the bucket or identify a new owner. Escalation will occur when owners cannot be identified.

- _Exceptions_: AWS accounts designated as **production** will not be subject to automatic deletion. For tagging violations in these accounts notifications will be sent to `<account owner / leadership contact>`.

**Additional Important Information:**

The security team has published a [Cloud Tagging Policy](../Documents/Cloud-Tagging-Policy.md) that requires an "Owner" (case-sensitive) tag to S3 buckets. We expect this change to be low impact, since existing buckets have been tagged in anticipation of this policy.

As the ability to identify resource ownership is an essential part of security, the security team plans to continue expanding this requirement to all other tag-able assets in AWS. While this announcement only impacts S3 buckets at this time, please instruct teams to begin adopting the use of "Owner" tags for all tag-able assets in AWS.

**‡ What is Cloud Custodian?**

[Cloud Custodian](https://cloudcustodian.io/) is an [open-source](https://github.com/cloud-custodian/cloud-custodian), real-time cloud monitoring and compliance tool. It has the ability to notify and/or enforce security policies on the resources it monitors.

_See internal Cloud Custodian Policy documentation [here](../Documents/Cloud-Custodian-Policy.md)._

From the documentation: _Cloud Custodian is a rules engine for managing public cloud accounts and resources. It allows [administrators the ability] to define policies to enable a well managed cloud infrastructure, that's both secure and cost optimized... Cloud Custodian can be used to manage AWS, Azure, and GCP environments by ensuring real-time compliance to security policies (like encryption and access requirements), tag policies, and cost management via garbage collection of unused resources and off-hours resource management._

---
