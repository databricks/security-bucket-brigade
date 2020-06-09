#!/bin/bash

#
# Quick script to attempt to quicky scan an S3 bucket via sync'ing
# the content locally, doing some manipulations, and then using COTS
# tools to locate credential candidates.
#

BUCKET=$1
if [ -z "$BUCKET" ]; then
	echo 'ERROR: must specify public bucket'
	exit 1
fi

ROOT=`pwd`

[ -z "${BASE}" ] && BASE=/tmp/
[ -z "${YAR}" ] && YAR=${ROOT}/yar
[ -z "${YAR_CONFIG}" ] && YAR_CONFIG=${ROOT}/yar.json
[ -z "${YAR_CONVERT}" ] && YAR_CONVERT=${ROOT}/yar_json_to_html.py

# Check pre-reqs
if ! [ -x "$(command -v git)" ]; then
	echo 'ERROR: git not found'
	exit 1
fi
if ! [ -x "$(command -v aws)" ]; then
	echo 'ERROR: aws-cli not found'
	exit 1
fi
if ! [ -x "$(command -v unzip)" ]; then
	echo 'ERROR: unzip not found'
	exit 1
fi

# Prepare a new working directory
echo "STATUS[${BUCKET}]: Starting"
WORKDIR=${BASE}/bucket_$1/
rm -rf ${WORKDIR}
mkdir -p ${WORKDIR}

pushd ${WORKDIR} > /dev/null

# Test access
echo "STATUS[${BUCKET}]: Testing S3 content access"
aws s3 ls s3://$1/ ${AUTH} > /dev/null
if [ $? -ne 0 ]; then
	echo "ERROR[${BUCKET}]: aws access/ls failed (auth?)"
	exit 1
fi


# Sync content; we are going to attempt to skip syncing some
# kown major data file items, because ultimately the tools in
# this setup are N/A to do anything with them
echo "STATUS[${BUCKET}]: Downloading S3 bucket contents"
aws s3 cp s3://$1/ . ${AUTH} --recursive --quiet \
	--exclude "*AWSLogs/*" \
	--exclude "*cflogs/*" \
	--exclude "*.parquet" \
	--exclude "*.parquet.gz" \
	--exclude "*.json.gz" \
	--exclude "*.csv" \
	--exclude "*.csv.gz" \
	--exclude "*.crc" \
	--exclude "*.delta" \
	--exclude "*.jpg" \
	--exclude "*.jpeg" \
	--exclude "*/_SUCCESS" \
	--exclude "*/_committed_*" \
	--exclude "*/_started_*" \
	--exclude "*/part-*"

# Ensure we delete whatever we downloaded
function cleanup {
    echo "STATUS[${BUCKET}]: Cleaning up work directory"
    rm -rf ${WORKDIR}
}
trap cleanup EXIT

# Capture some file stats of how much we downloaded
DU_FILES=`du --inodes ${WORKDIR} -c | tail -1 | cut -f1`
echo "STATUS[${BUCKET}]: File count (approx): ${DU_FILES}"
DU_MEGS=`du -m ${WORKDIR} -c | tail -1 | cut -f1`
echo "STATUS[${BUCKET}]: File data quantity: ${DU_MEGS}MB"

echo "STATUS[${BUCKET}]: Expanding ZIP files"
find . -type f -iname \*.zip \
	-exec mkdir -p {}-unzip \; \
	-exec unzip -qq -o {} -d {}-unzip/ \; \
	-exec rm {} \;

echo "STATUS[${BUCKET}]: Expanding JAR files"
find . -type f -iname \*.jar \
	-exec mkdir -p {}-unzip \; \
	-exec unzip -qq -o {} -d {}-unzip/ \; \
	-exec rm {} \;

# Remove a bunch of .gz before we expand; these may come out of .zip files
echo "STATUS[${BUCKET}]: Removing compressed datalake files"
find . -iname \*.parquet.gz -exec rm {} \;
find . -iname \*.csv.gz -exec rm {} \;
find . -iname \*.json.gz -exec rm {} \;
# NOTE: we are going to leave log.gz

# Now expand anything .gz, which will include tars
echo "STATUS[${BUCKET}]: Expanding GZ files"
find . -iname \*.gz -exec gzip -df {} \; 

# Re-prune any newly recreated large files after decompressing
echo "STATUS[${BUCKET}]: Truncating large files"
find . -type f -size +32000000c -exec truncate -s 32000000 {} \;

# The TAR might might be truncated, but that's ok -- it will expand out
# whatever it can within the first 32MB
echo "STATUS[${BUCKET}]: Unarchiving tar files"
find . -type f -iname \*.tar \
	-exec mkdir -p {}-tar \; \
	-exec tar xkf {} -C {}-tar/ \; \
	-exec rm {} \;

# All the unzip, untar, etc. might produce files we do not want, which just slows
# down time to put them into git
echo "STATUS[${BUCKET}]: Removing unscannable/low-value files"
find . -type f -iname \*.ai -exec rm {} \;
find . -type f -iname \*.png -exec rm {} \;
find . -type f -iname \*.jpg -exec rm {} \;
find . -type f -iname \*.parquet\* -exec rm {} \;
find . -type f -iname \*.crc -exec rm {} \;
find . -type f -iname \*.csv -exec rm {} \;
find . -type f -iname \*.lzf -exec rm {} \;
find . -type f -iname \*.avro -exec rm {} \;
find . -type d -name AWSLogs -exec rm -rf {} \;

# Next, we are going to leverage COTS git repo scanning tools, so will
# wrap the files into a git repo
echo "STATUS[${BUCKET}]: Adding files into a local git repo container"
git init > /dev/null
git add -A . >/dev/null 2>/dev/null
if [ $? -ne 0 ]; then
	echo "ERROR[${BUCKET}]: git add failed (no files?)"
	exit 1
fi
git commit -m 'scan' >/dev/null 2>/dev/null
if [ $? -ne 0 ]; then
	echo "ERROR[${BUCKET}]: git commit failed"
	exit 1
fi

# Run the COTS scanner
echo "STATUS[${BUCKET}]: Running scanner"
$YAR -r . --config ${YAR_CONFIG} -s -b -n 4 > /dev/null

# Save the output
popd > /dev/null
if [ -f "${WORKDIR}/findings.json" ]; then
    echo "STATUS[${BUCKET}]: Saving findings"
    mv ${WORKDIR}/findings.json ./yar-${BUCKET}-findings.json
    python3 ${YAR_CONVERT} ${BUCKET} ./yar-${BUCKET}-findings.json > ./yar-${BUCKET}-findings.html

    # Save some metadata
    date > ./yar-${BUCKET}-meta.txt
    echo "Bucket: ${BUCKET}" >> ./yar-${BUCKET}-meta.txt
    echo "Files: ${DU_FILES}" >> ./yar-${BUCKET}-meta.txt
    echo "Megabytes: ${DU_MEGS}" >> ./yar-${BUCKET}-meta.txt

else
    echo "ERROR[${BUCKET}]: Findings file not found"
fi


