import copy
import logging
import boto3
import json

from botocore.exceptions import ClientError


def bucket_creation_date(bucket_name):
    """Retrieve bucket creation date"""
    s3 = boto3.client('s3')
    try:
        response = s3.get_public_access_block(Bucket=bucket_name)
        if response["PublicAccessBlockConfiguration"]["IgnorePublicAcls"] == True or response["PublicAccessBlockConfiguration"]["BlockPublicPolicy"] == True or response["PublicAccessBlockConfiguration"]["BlockPublicAcls"] == True or response["PublicAccessBlockConfiguration"]["RestrictPublicBuckets"] == True:
            return 0
    except ClientError as e:
        logging.error(e)
        return 1


def get_public_access_block(bucket_name):
    """Retrieve public access block of s3 bucket_name"""
    s3 = boto3.client('s3')
    try:
        response = s3.get_public_access_block(Bucket=bucket_name)
        if response["PublicAccessBlockConfiguration"]["IgnorePublicAcls"] == True or response["PublicAccessBlockConfiguration"]["BlockPublicPolicy"] == True or response["PublicAccessBlockConfiguration"]["BlockPublicAcls"] == True or response["PublicAccessBlockConfiguration"]["RestrictPublicBuckets"] == True:
            return 0
    except ClientError as e:
        logging.error(e)
        return 1


def put_public_access_block(bucket_name):
    """Put public access block on s3 bucket_name"""
    s3 = boto3.client('s3')
    try:
        response = s3.put_public_access_block(
            Bucket=bucket_name,
            PublicAccessBlockConfiguration={
                'BlockPublicAcls': False,
                'IgnorePublicAcls': True,
                'BlockPublicPolicy': False,
                'RestrictPublicBuckets': False
            }
        )
    except ClientError as e:
        logging.info(e)
        return None


def c7n_update_public_access_block(event_list):
    """Set up logging"""
    logging.basicConfig(level=logging.INFO,
                        format='%(levelname)s: %(asctime)s: %(message)s')

    """Prasing event"""
    s3_bucket_name = event_list["resources"][0]['Name']

    """Get public access block"""
    if get_public_access_block(s3_bucket_name) != 0:
        logging.info("No public block found: %s", s3_bucket_name)
        """Put public access block"""
        try:
            block = put_public_access_block(s3_bucket_name)
            return 0
        except ClientError as e:
            logging.error(e)
            return -1


def lambda_handler(event, context):
    return c7n_update_public_access_block(event)
