# Bucket Brigade

What do you do in the face of sensitive data exposure in public-facing S3 buckets? Call in the **Bucket Brigade**

---

**Quick Start**: To get immediate real-time monitoring enabled for your public S3 buckets, go [here](./Tools/s3-secrets-scanner/README.md).

---

After experiencing a potential accidental exposure of sensitive information in one of our intentionally public S3 buckets, we realized a full audit of our bucket policies and process was in order. What resulted was a 6-month process of back-and-forth communications, negotiations with account owners, policy definitions, and tool development.

Hoping to help others avoid the same things that slowed us down, we're sharing not only the tools we created/used, but also the process and communications. This repository provides a wholistic approach to solving the problem of, "How do I get on top of secrets in my public S3 buckets and stay on top?" Each portion of the solution is broken into parts within this repository.

Start with the [Solution Write-up](./Documents/Solution-Write-up.md) in the "Documents" section below for an overview of the phases in the solution we created, and then use the communication templates and tools to implement your approach to a secure S3 state.

## Documents

1. [Solution Write-up](./Documents/Solution-Write-up.md)
1. [Presentation](TBD)

## Policies

- [Public Access Block for Cloud Resources](./Documents/Cloud-Custodian-Policy.md)
- [Exception for Public Access Block](./Documents/Public-Access-Exception-Policy.md)
- [Cloud Tagging Policy](./Documents/Cloud-Tagging-Policy.md)

## Communications

- ✉️ Cloud Custodian Public Access Block ([Leadership](./Communications/Custodian-Public-Access-Block-Leadership_Email-Template.md), [General](./Communications/Custodian-Public-Access-Block-General_Email-Template.md))
- ✉️ "Owner" Tag Enforcement ([Leadership](./Communications/Tag-Enforcement-Leadership_Email-Template.md), [General](./Communications/Tag-Enforcement-General_Email-Template.md))

## Tools

1. **[S3 Scan](./Tools/s3_scan/README.md)**
1. **[S3-Secrets-Scanner](./Tools/s3-secrets-scanner/README.md)**
1. **[Cloud Custodian Policies / Functions](./Tools/CloudCustodian/README.md)**

## Related Tools / Resources

- [Cloud Custodian](https://cloudcustodian.io/docs/index.html?button=documentation)

  "Cloud Custodian is a tool that unifies the dozens of tools and scripts most organizations use for managing their public cloud accounts into one open source tool. It uses a stateless rules engine for policy definition and enforcement, with metrics, structured outputs and detailed reporting for clouds infrastructure. It integrates tightly with serverless run-times to provide real time remediation/response with low operational overhead."

- [JupiterOne](https://jupiterone.com/)

  JupiterOne is a tool for centralizing security operations and compliance for cloud platforms. In the context of this project, it provides a way to inventory AWS resources - even across multiple AWS accounts - and query the state. Once configured, a simple query can show which buckets are publicly exposed.

- [YAR](https://github.com/Furduhlutur/yar): Git Secret Scanner

  YAR is designed to be a Github scanning tool, to scan the complete commit history of a repo for secrets. Our team repurposed it internally to do quick bucket scanning by cloning the bucket creating initializing a Git repo at the root. This provided a simple way to use the existing pattern matching to find secrets with only small modifications.

## License

This repository, all documents and underlying tools are licensed under the [MIT license](./LICENSE.txt), with the exception of the [S3 Scan](./Tools/s3_scan/README.md) tool, which is licensed under [GPL v3 license](./Tools/s3_scan/LICENSE.txt), consistent with the licensing for the [YAR](https://github.com/Furduhlutur/yar) tool it uses.
