# S3 Scan

Quick tool to scan S3 contents using the popular [YAR](https://github.com/Furduhlutur/yar) Github repo scanner.

## Process Summary

1. Create a new EC2 instance
1. Install the scanning scripts to the EC2 instance
1. Create a list of S3 buckets to scan
1. Run the scripts to scan the bucket and produce findings for review
1. Review the findings to assess any concerning information findings/exposures

### Detailed Steps

1.  Create a new EC2 instance

    It is recommended to create the instance in the same AWS region as the target bucket to scan. While it is possible to scan from a different region, this causes significant delay to transit data, and potentially incurs unnecessary data transfer costs. It is more efficient overall to scan from the same region.

    The EC2 instance specs are flexible depending upon the desired cost and workload; we generally recommend:

    - **AMI**: Latest Amazon Linux
    - **Instance type**: c5.large OR c5.xlarge

      _Note: for very large buckets, instances with more memory may be necessary to accommodate the phase of the scan where a Git repository is created of the downloaded files (e.g. c5.4xlarge)_

    - **EBS volume**: Mininum of 300GB; More may be necessary if scanning very large buckets
    - **IAM role**: An IAM role is only necessary if scanning a bucket that is not public anonymous readable, and you are not configuring the scan to use explicitly-provided IAM credentials.

      The IAM role should have sufficient read access (s3:GetObject*, s3:List*) to the target bucket.

    - **SSH Key**: SSH access is required, so be sure to create the instance with an accessible key and security group

1.  Install the scanning scripts

    - Use SSH scp to copy this `s3_scan/` folder contents to the EC2 instance

    - SSH to the instance and change your directory to the location the files were copied:

      - Uncompress the `yar.gz` binary:

      ```bash
      gzip -d yar.gz
      ```

      - Run the `setup.sh` script to install dependencies:

      ```bash
      sudo chmod +x setup.sh
      sudo ./setup.sh
      ```

1.  Create a bucket target list

    _While still logged into the EC2 instance via SSH:_

    - Using your preferred Unix text editor to create a new file named `buckets.txt`

    - Within the file add one or more lines of the following format:

      ```
      region_name <SPACE> bucket_name <SPACE> authentication_type <CRLF>
      ```

      Where:

      - `region_name` is the AWS region that contains the bucket (e.g. `us-east-1`, `us-west-2`, etc.)

      - `bucket_name` is the AWS bucket name, e.g. `example-public-bucket`

      - `authentication_type` is one of the following values:

      `ANON` for unauthenticated/anonymous access _(i.e. when the bucket allows “Everyone” public access to list and read bucket contents)_

      `SELF` to use an attached IAM profile credentials for access _(i.e. when either “Authenticated Users” is necessary to list/read a bucket, or further specific credentials are warranted)_

      `RPSELF` to use the attached IAM profile credentials for requestor-pays access _(same as SELF, but sets the requestor-pays access flag, which can only be set in combination with an explicit IAM identity)_

      Full AWS role ARN to use the attached IAM profile credentials to AssumeRole into the given role _(e.g. `arn:aws:iam::123456789:role/XXX`)_

      A static IAM access key and secret _(e.g. `AKIAXXXXXX:fwdrsdfsdfsdf`)_

      _Which type of authentication to use is contextually dependent upon the exact access controls the S3 bucket is configured for, and whether there is desire to scan the bucket from the perspective of what is publicly accessible (using `ANON` or `SELF` access) or more thoroughly from an internal perspective (using `SELF`, an explicit AKIA, or a role). Multiple different scan types and exposure analyses can be conducted simply be changing which authentication is used to access the bucket._

      Example `buckets.txt` file:

      ```
      us-east-1 example-anon-public ANON
      us-west-1 example-usw SELF
      us-west-1 example-bucket RPSELF
      us-west-2 example-internal arn:aws:iam::123456789:role/InternalBucketAccessRole
      us-west-2 limited-access AKIADEADBEEFDEADBEEF:a0BzE1bSea0BzE1bSea0BzE1bSea0BzE1bSe
      ```

      _Note: Multiple buckets can be scanned, using a mixture of authentication types. The number of parallel buckets to scan is tunable by editing the `multi_scan.py` script and changing the `POOL_SIZE` variable._

      _Many buckets will expose `s3:GetObject` access to public entities, but may not provide `s3:List` access. This tool requires `s3:List` access to enumerate the objects to scan._

1.  Run the scanner

    _While still logged into the EC2 instance via SSH:_

    Run the scanner, using the command:

    ```bash
    python3 multi_scan.py buckets.txt
    ```

    The scanner will output assorted status (and error) outputs to the terminal. Status messages are purely informational. Error messages indicate inability to scan the bucket; any error message should be taken as indicate the bucket was not scanned.

    ```
    STATUS[example-anon-public]: Starting
    STATUS[example-bucket]: Starting
    STATUS[example-anon-public]: Downloading S3 bucket contents
    ERROR[example-bucket]: aws access/ls failed (auth?)
    ```

    Once all buckets have been scanned, the Python script will exit. In the current directly will be multiple files named:

    ```
    yar-{BUCKET}-findings.json
    yar-{BUCKET}-findings.html
    yar-{BUCKET}-meta.txt
    ```

    where `{BUCKET}` is the name of the scanned bucket.

    The purpose of each file is as follows:

    - `yar-{BUCKET}-findings.json`: programmatic (JSON format) findings output of all potential sensitive info/secrets
    - `yar-{BUCKET}-findings.html`: a human UI view of the findings, meant to be viewed within a web browser
    - `yar-{BUCKET}-meta.txt`: a simple text file indicating the time of the scan, how many files were approximately scanned, how much overall content (megabytes) were scanned, etc.

1.  Review the findings

    - Use SSH scp to copy all of the “yar-\*” files to a system where they can be analyzed

    - Using a web browser:

      - Open each `yar-{BUCKET}-findings.html` file

      - Manually browse/review each listed finding to determine if it represents a concerning piece of sensitive information (subject to the criteria of the scan effort)

      - Expand the indicated drop-down to review further context/details of where the credential was found, to help confirm the nature of the possible sensitive information

## License

Licensed under the GNU General Public License v3.0. See [LICENSE.txt](./LICENSE.txt).

NOTICE: A derivative of the [YAR tool](https://github.com/nielsing/yar) distributed in the [yar.gz](./yar.gz) archive has been modified from the original source (as detailed in the [yar.diff](./yar.diff)), and the included config file [yar.json](./yar.json) is a modified version of the [yarconfig.json](https://github.com/nielsing/yar/blob/master/config/yarconfig.json). The original YAR source code is available at https://github.com/nielsing/yar and the license is available at https://github.com/nielsing/yar/blob/master/LICENSE.
