**From:** CISO

**To:** AWS Account Owners / Leadership

**Subject:** [IMPORTANT] Cloud Custodian Policy: Public Access Block

**Message Body:**

---

**What:** New _and_ modified AWS S3 buckets will have public access blocks **automatically** applied via Cloud Custodian‡ _(see "What is Cloud Custodian"‡)_ — public access blocks may impact access to objects in **existing buckets** if an [appropriate exception](../Documents/Public-Access-Exception-Policy.md) is not acquired prior to changes to the bucket

**Why:** Non-public S3 buckets may expose objects publicly through the use of bucket or object access control lists (ACLs) — by enabling automated public access blocks, the risk of inadvertent exposure of non-public data is reduced

**When:** `<enforcement date>`

**Where:** This policy will be effective for all AWS accounts, including production accounts\*

**Requested Actions:**

- Before `<notification date>`: Proactively confirm or provide feedback/concerns to `<Bucket Brigade Contact>` regarding the below Cloud Custodian policy regarding forceful application of public access blocks
- Ensure [public access exceptions](../Documents/Public-Access-Exception-Policy.md) have been acquired for all existing AWS S3 buckets that require public access to _any_ objects in the bucket
- Communicate timelines in this email to teams who own, create or modify AWS S3 buckets

**\* Enforcement Details**

- _New **and** modified_ AWS S3 buckets that have been tagged with an approved `public-exception` tag will be automatically updated via Cloud Custodian‡ to enable the "Block public access to buckets and objects granted through any access control lists (ACLs)" setting. Users will not be able to remove this block until an exception is in place.

- _Existing, unmodified_ AWS S3 buckets **will not** be impacted at this time. However, it is recommended that _all_ bucket owners update their public access blocks in accordance with the [Cloud Custodian policy recommendation](../Documents/Cloud-Custodian-Policy.md)

- _Exceptions_: AWS S3 buckets with an exception designated by a `public-exception` tag will not be subject to automatic enforcement. Note that this tag _may not_ be applied directly by users - it must be applied by a member of the security team as part of the [exception process](../Documents/Public-Access-Exception-Policy.md)

**‡ What is Cloud Custodian?**

[Cloud Custodian](https://cloudcustodian.io/) is an [open-source](https://github.com/cloud-custodian/cloud-custodian), real-time cloud monitoring and compliance tool. It has the ability to notify and/or enforce security policies on the resources it monitors.

_See internal Cloud Custodian Policy documentation [here](../Documents/Cloud-Custodian-Policy.md)._

From the documentation: _Cloud Custodian is a rules engine for managing public cloud accounts and resources. It allows [administrators the ability] to define policies to enable a well managed cloud infrastructure, that's both secure and cost optimized... Cloud Custodian can be used to manage AWS, Azure, and GCP environments by ensuring real-time compliance to security policies (like encryption and access requirements), tag policies, and cost management via garbage collection of unused resources and off-hours resource management._

---
