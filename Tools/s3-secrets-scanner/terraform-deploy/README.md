# S3-Secrets-Scanner: Terraform Infrastructure

The following instructions / explanation is for direct use, but can readily be adapted for use with a CI/CD pipeline if desired.

## Execution Prerequisites

- [Terraform](https://www.terraform.io/) - use `terraform init` to configure the required AWS plugins
- AWS credentials configured with sufficient permission for deployment to required accounts

## Build

If changes have been made to S3-Secrets-Scanner, it is important to create an appropriate distribution archive (zip) file to be used with the Terraform deployment. This archive must be located at the root of this directory for reference by the Terraform deployment.

Generally a deployment archive is just the `index.js` and `rules.json` files zipped.

To allow the possibility of different versions of the code in different regions, the filename for the archive is maintained in `/configs/<filename>` with the `lambda_filename` variable.

**Important**: When using multiple Terraform config files, update the `lambda_filename` variable in _each_ config file that should use the new code deployment. This permits multiple versions to be deployed simultaneously.

## Deploy

1. Retrieve current Terraform state
1. Switch to or create the appropriate [Terraform workspace](https://www.terraform.io/docs/state/workspaces.html) for the account/region to be updated
   - Switch
     - `terraform workspace select <name of workspace as found in terraform.tfstate.d directory>`
     - example: `terraform workspace select aws-example-account_us-west-2`
   - Create
     - `terraform workspace new <name of workspace using the form account-name_region>`
     - example: `terraform workspace new aws-example-account_eu-west-1`
1. Create / Update config file for the AWS account / region

   - Create (**only required if file does not already exist**)

     1. Create a new file in the `/configs/` directory using the following naming format: `aws-<account name>.<region>` (e.g. `aws-example-account.eu-west-1`)
     1. Set the following variables:

        - `profile`: name of AWS profile to use, as configured in `~/.aws/credentials` file
        - `region`: name of aws region (e.g. `us-west-1`)
        - `buckets`: array of bucket names (e.g. `[ "bucket-name-1", "another-bucket-2"]`)
        - `lambda_filename`: exact name of archive file with the S3-Secrets-Scanner distribution archive \*(See "Build" step above)\_ (e.g. `s3-secrets-scanner_1.0.0.zip`)

          **IMPORTANT**: this filename must exist in the root of the `terraform-deploy` directory

        - `tags`: map of tags to add to the resources created (e.g.
          ```
            {
                Owner = "security@company.com"
            }
          ```
          ); all resources are tagged identically

   - Update:

     - Change any of the variables as appropriate _(see above "Create" section)_

       **IMPORTANT**: the `lambda_filename` **must** be updated for any region where an updated code distribution should be distributed

1. When temporary STS credentials are used, update the AWS Credentials profile matching the selected workspace/config
1. Apply Terraform config using the appropriate file (e.g. `terraform apply -var-file="./configs/aws-example-account.us-west-2.tfvars"`)

1. Review the Terraform plan and confirm the changes

   **Note**: If the changes fail to apply, review the errors. In many cases (e.g. a resource is locked), the plan can simply be re-run and the changes will occur correctly.

Note: The output from the `terraform apply` will confirm the profile used, region, and the ARNs of the buckets that are configured for monitoring.

If any error new error messages are displayed, review configuration edits. Review the Terraform steps and warnings.

## Maintain State

Once Terraform has run successfully, it is important to maintain the state for subsequent runs.

States are written to the `terraform.tfstate.d` directory for the configured workspace. The `terraform.tfstate` and `terraform.tfstate.backup` files created/updated. These files should be stored in a shared location accessible to maintainers.
