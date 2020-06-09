# Datastore Public Access Exception Policy

_Please send policy questions to `<security team email>`._

## Overview

Our security policies (`<link to company data policy>`) govern how we protect data in order to meet customer and regulatory requirements, in addition to protecting our company. When deviations from the security policies, standards, procedures or other security requirements are necessary, an exception request must be submitted to the Security Team and approved to any deviation.

## High-level Process Steps

1. Resource owner submits an exception request to the Security Team
1. Security Team reviews the request
1. Teams relevant to the exception request and resource are consulted
1. Necessary parties will approve or deny the request
1. Repeat the exception process annually (unless otherwise specified)

## Instructions

### AWS S3 Bucket or Azure Blob Storage Exception Requests

Employees may submit a AWS S3 Bucket or Azure Blob Storage exception request via email intake to the Security Team via the email `<security team intake email>` using the following template:

    Subject: S3 / Blob Security Exception Request
    Body:
    ---
    Account Name:
    S3 Bucket / Azure Blob Name:
    Department:
    Requester:
    Resource Owner:
    Approving Manager:
    Requested Duration (Up to 1 Year):
    Justification:

## What to Expect After Submitting a Request

### Service Level Agreements (SLAs)

- Security Team will perform an initial exception review and document the request with a ticket (within `<3 business days>`)
- Security Team will engage other teams as needed for approvals and technical implementations (within `<5 business days>`\*)
- Request will be approved or denied directly on the ticket
- Approved requests will have necessary exception tagging and continuous monitoring added (within `<2 business days>`)

_\* For high sensitivity requests, the Security & Privacy Committee may be required to review and approve the request. This team meets `<monthly>`._

### Renewal

Exceptions are only valid for the duration approved in the exception ticket. Resource owners are required to re-apply for the exception _prior to_ expiration to avoid any service disruption _(including appropriate time for processing the exception - See SLAs)_.

Exception renewals follow the same process as new requests, with two exceptions:

1. Review timelines are generally shorter
1. Tagging and continuous monitoring will not have to be re-applied if the exception was renewed before expiration

Expired exceptions cannot be renewed and will be considered a new exception request.

### Ongoing Security Activity

The Security Team will:

1. Continuously monitor resource with exceptions for public secrets‡
1. Review exceptions and provide owners advanced notice if the exception is near expiration (typically `<14 days>` before expiration)
1. Remove exception tags and revoke public access for resources with expired exceptions

‡ If the security team detects any content that appears to be non-public or violates our security policies (`<link to company data policy>`), the Security team may quarantine the resource in question and will contact the identified owner to ensure the data is appropriate for public exposure.
