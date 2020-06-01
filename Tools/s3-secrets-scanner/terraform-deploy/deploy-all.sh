#!/bin/bash

# Convenience file to deploy to multiple accounts / regions
# Sample config lines:
# terraform workspace select default_us-east-1 && terraform apply -var-file="./configs/default.us-east-1.tfvars" -auto-approve
# terraform workspace select another-profile_us-west-2 && terraform apply -var-file="./configs/another-profile.us-west-2.tfvars" -auto-approve

echo "\"deploy-all\" Not Configured - Edit script and re-run" # Comment / Remove this line when configured