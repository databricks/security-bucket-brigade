#!/usr/local/bin/python3

import sys, os, subprocess, json, time
from multiprocessing.pool import ThreadPool
import boto3

POOL_SIZE = 4
SCRIPT = './scan.sh'

def prepare_creds(creds):
    myenv = os.environ.copy()

    if creds.startswith("ANON"):
        myenv["AUTH"] = "--no-sign-request"

    elif creds.startswith("SELF"):
        # Just allow the SDK to use self creds
        pass

    elif creds.startswith("RPSELF"):
        # Requestor-pays self
        myenv["AUTH"] = "--request-payer requester"

    elif creds.startswith("AKIA"):
        parts = creds.split(":", 2)
        myenv["AWS_ACCESS_KEY_ID"] = parts[0]
        myenv["AWS_SECRET_ACCESS_KEY"] = parts[1]

    elif creds.startswith("arn:aws:iam:"):
        # Use self to assume into given role
        role = creds
        sts = boto3.client('sts')
        res = sts.assume_role(RoleArn=role, RoleSessionName="MultiScanner")
        myenv["AWS_ACCESS_KEY_ID"] = res['Credentials']['AccessKeyId']
        myenv["AWS_SECRET_ACCESS_KEY"] = res['Credentials']['SecretAccessKey']
        myenv["AWS_SESSION_TOKEN"] = res['Credentials']['SessionToken']

    return myenv
    

def scan(bucket, creds):

    myenv = prepare_creds(creds)
    ARGS = [SCRIPT, bucket]

    try:
        print("START[%s]: creds=%s" % (bucket, creds[0:4]))
        p = subprocess.Popen(ARGS, env=myenv)
        p.wait()
        print("FINISH[%s]" % (bucket))

    except Exception as e:
        print("EXCEPTION: %s" % str(e))

def run(jobs):

    pool = ThreadPool(processes=POOL_SIZE)
    async_results = []

    for job in jobs:
        bucket = job[0]
        creds = job[1]

        async_results.append(
            pool.apply_async(
                scan,
                (bucket, creds)
            )
        )

    for ar in async_results:
        ar.get()
    

if __name__ == "__main__":
    import sys

    jobs = []

    tsv_file = sys.argv[1]
    with open(tsv_file, 'r') as f:
        while True:
            line = f.readline()
            if not line: break
            if line.startswith('#'): continue
            parts = line.strip().split(" ")
            # region, bucket, creds
            job = (parts[1], parts[2])
            jobs.append(job)

    run(jobs)
