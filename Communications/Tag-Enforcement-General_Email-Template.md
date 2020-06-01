**From:** CISO

**To:** All AWS Users / Whole Company

**Subject:** Automatic Removal for Non-Compliant S3 Buckets / Required Cloud Tagging Policy

**Message Body:**

---

_If you do not create resources in cloud accounts (e.g. AWS, Azure, GCP), you may stop reading or consider the following informational only._

**What:** **Automatic removal** of new AWS S3 buckets without a valid “Owner” tag begins\*

**When:** `<enforcement date>`

**Requested Actions**

- Review the Cloud Asset Tagging policy, located here: [Cloud Tagging Policy](../Documents/Cloud-Tagging-Policy.md)

- **Prior to `<enforcement date>`**, ensure any existing S3 buckets you own are tagged

**Details**

- _New_ AWS S3 buckets with missing or non-compliant “Owner” tags will be automatically deleted via Cloud Custodian‡ if not tagged within one hour of creation. To ensure resources are not removed, add tags at the time of creation. Removed resources are not recoverable.

- _Existing_ AWS S3 buckets must maintain required tags. However, S3 buckets that have required tags removed after creation **will not** be automatically deleted. Previously identified owners will be contacted to re-tag the bucket or identify a new owner. Escalation will occur when owners cannot be identified.

- _Exceptions_: AWS accounts designated as **production** will not be subject to automatic deletion. For tagging violations in these accounts notifications will be sent to `<account owner / leadership contact>`.

**Additional Information**

Asset tagging in cloud environments (AWS, Azure, GCP, etc.) is critical for security, compliance, and cost attribution efforts. Tagging allows quick identification of asset ownership and other critical properties. These properties are often critical when doing an incident follow-up.

**‡ What is Cloud Custodian?**

[Cloud Custodian](https://cloudcustodian.io/) is an [open-source](https://github.com/cloud-custodian/cloud-custodian), real-time cloud monitoring and compliance tool. It has the ability to notify and/or enforce security policies on the resources it monitors.

_See internal Cloud Custodian Policy documentation [here](../Documents/Cloud-Custodian-Policy.md)._

From the documentation: _Cloud Custodian is a rules engine for managing public cloud accounts and resources. It allows [administrators the ability] to define policies to enable a well managed cloud infrastructure, that's both secure and cost optimized... Cloud Custodian can be used to manage AWS, Azure, and GCP environments by ensuring real-time compliance to security policies (like encryption and access requirements), tag policies, and cost management via garbage collection of unused resources and off-hours resource management._

Please address any questions about the above to `<Bucket Brigade Contact>`.

---
