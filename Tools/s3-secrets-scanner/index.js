// Native Modules
const fs = require("fs");
const fsPromises = fs.promises;
const readline = require("readline");

const REGION = process.env.AWS_REGION;

const AWS = require("aws-sdk");
AWS.config.update({ region: REGION });

const { Rules, FileBlacklist, SecretsWhiteList } = require("./rules.json");
const TEMP_FILE = `/tmp/upload-${Math.floor(Math.random() * 10000)}`;
const possibleSeverities = ["high", "medium", "low", "info"];

// Environment Variable-based Configs
const MAX_SIZE_MEGABYTES = parseInt(process.env.MAX_SIZE_MEGABYTES, 10) || 100;
const CONTEXT_LINES =
  !isNaN(parseInt(process.env.CONTEXT_LINES, 10)) &&
  parseInt(process.env.CONTEXT_LINES, 10) >= 3
    ? parseInt(process.env.CONTEXT_LINES, 10)
    : 5;
const CONTEXT_LINE_MAX_LENGTH =
  parseInt(process.env.CONTEXT_LINE_MAX_LENGTH, 10) || 100;
const SQS_ALERT_URL =
  typeof process.env.SQS_ALERT_URL === "string"
    ? process.env.SQS_ALERT_URL
    : null;
const NOISE_THRESHOLD =
  !isNaN(parseInt(process.env.NOISE_THRESHOLD, 10)) &&
  parseInt(process.env.NOISE_THRESHOLD, 10) >= 0
    ? parseInt(process.env.NOISE_THRESHOLD, 10)
    : 5;
const MINIMUM_ALERT_THRESHOLD =
  typeof process.env.MINIMUM_ALERT_THRESHOLD === "string" &&
  possibleSeverities.indexOf(
    process.env.MINIMUM_ALERT_THRESHOLD.toLowerCase()
  ) >= 0
    ? process.env.MINIMUM_ALERT_THRESHOLD.toLowerCase()
    : "low";

const unescapeS3Key = key => {
  key = decodeURI(key);
  // Amazon S3 uses "+" for spaces
  key = key.replace(/\+/g, " ");
  // Amazon S3 uses encoded "+" (%2B) for the "+" symbol
  key = key.replace(/\%2B/gi, "+");
  return key;
};

const checkSkips = async s3Data => {
  let skipReason = undefined;
  const key = s3Data.object.key;

  const BYTES_PER_KILOBYTE = 1024;
  const BYTES_PER_MEGABYTE = Math.pow(BYTES_PER_KILOBYTE, 2);
  const MAX_SIZE = MAX_SIZE_MEGABYTES * BYTES_PER_MEGABYTE;

  const objectSize = s3Data.object.size;

  const fileTypes = await convertFileTypes();
  let ignoredType = false;
  let ignoredPattern = null;
  fileTypes.forEach(typeRegex => {
    if (typeRegex.test(key)) {
      ignoredType = true;
      ignoredPattern = typeRegex;
    }
  });
  if (ignoredType)
    return `Ignoring object with blacklist exclusion: Matched pattern ${ignoredPattern}`;

  if (objectSize > MAX_SIZE)
    return `Ignoring large files: Over ${MAX_SIZE_MEGABYTES}MB`;
  if (key.endsWith("/")) return 'Ignoring "folder" object';

  return skipReason;
};

const getS3Object = async record => {
  const bucket = record.bucket.name;
  const key = record.object.key;
  const unescapedKey = unescapeS3Key(key);

  const s3 = new AWS.S3({ apiVersion: "2006-03-01", region: "us-west-2" });
  const params = {
    Bucket: bucket,
    Key: unescapedKey
  };

  const data = await s3.getObject(params).promise();
  await fsPromises.writeFile(TEMP_FILE, data.Body);

  return true;
};

const unescapeJsonSlashes = jsonEscapedString => {
  let unescaped = "";
  if (typeof jsonEscapedString === "string")
    unescaped = jsonEscapedString.replace(/\\\\/gi, "\\");
  return unescaped;
};

const convertRulesJson = async () => {
  const rules = [];
  Rules.forEach(rule => {
    // Skip malformed rules
    if (typeof rule.Rule === "string" && typeof rule.Reason === "string") {
      const unescapedRule = unescapeJsonSlashes(rule.Rule);
      try {
        rules.push({
          reason: rule.Reason,
          rule: new RegExp(unescapedRule, "gmi"),
          noise: rule.Noise || NOISE_THRESHOLD
        });
      } catch (err) {
        console.log(err);
      }
    }
  });
  return rules;
};

const convertFileTypes = async () => {
  const types = [];
  FileBlacklist.forEach(type => {
    if (typeof type === "string") {
      const unescapedType = unescapeJsonSlashes(type);
      types.push(new RegExp(unescapedType, "gi"));
    }
  });
  return types;
};

const getFileStream = () => {
  return fs.createReadStream(TEMP_FILE);
};

const computeSeverityFromNoise = noise => {
  const noiseDelta = NOISE_THRESHOLD - noise;
  let returnValue = undefined;

  // Only return a defined value if threshold is satisfied
  if (noiseDelta >= 0) {
    const computedPosition = possibleSeverities.length - 1 - noiseDelta;
    // Boundary check
    const rangeAdjustedPosition = computedPosition >= 0 ? computedPosition : 0;
    returnValue = possibleSeverities[rangeAdjustedPosition];
  }

  return returnValue;
};

const processFileLines = async (fileStream, tests, s3Data) => {
  const secrets = [];
  const context = [];
  const CONTEXT_HISTORY = Math.floor(CONTEXT_LINES / 2);
  let lineNum = 1;
  let highestProcessedSeverity =
    possibleSeverities[possibleSeverities.length - 1];

  // crlfDelay option deals with multiple line termination types (e.g. '\r\n')
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  // Keep track of how many history items need to be traversed to add context
  let secretHistoryLimit = 0;

  for await (const line of rl) {
    let foundMatch = false;
    let truncatedLine = line.substring(0, CONTEXT_LINE_MAX_LENGTH);
    const TRUNCATED_DELIMITER = "…";
    if (line.length !== truncatedLine.length) {
      truncatedLine += TRUNCATED_DELIMITER;
    }
    tests.forEach(async test => {
      // Skip test if the noise is above the threshold or a match has already been found
      if (test.noise < NOISE_THRESHOLD && !foundMatch) {
        const bucket = s3Data.bucket.name;
        const key = s3Data.object.key;
        const unescapedKey = unescapeS3Key(key);

        let matches = [];
        const rule = test.rule;

        while ((matches = rule.exec(line)) !== null) {
          const match = matches[0];

          // Skip whitelisted secrets
          if (!SecretsWhiteList.includes(match)) {
            foundMatch = true;
            const computedSeverity = computeSeverityFromNoise(test.noise);

            const secret = {
              Reason: test.reason,
              Filepath: key,
              URL: `https://${bucket}.s3-${REGION}.amazonaws.com/${key}`,
              S3URL: `s3://${bucket}/${unescapedKey}`,
              Secret: match,
              Severity: computedSeverity,
              Position: {
                Line: lineNum,
                Column: rule.lastIndex - match.length,
                Length: match.length
              },
              Context: `${context.join("\n")}`
            };
            secrets.push(secret);

            // Update highest severity, if needed
            if (
              possibleSeverities.indexOf(computedSeverity) >= 0 &&
              possibleSeverities.indexOf(computedSeverity) <
                possibleSeverities.indexOf(highestProcessedSeverity)
            ) {
              highestProcessedSeverity =
                possibleSeverities[
                  possibleSeverities.indexOf(computedSeverity)
                ];
            }
          } else {
            console.log(`Ignoring whitelisted secret: ${match}`);
          }
        }
      }
    });

    // Add context to previous secrets up to history limit
    for (let i = secrets.length - 1; i >= 0 && i >= secretHistoryLimit; i--) {
      if (secrets[i].Position.Line + CONTEXT_HISTORY >= lineNum) {
        secrets[i].Context += `\n${truncatedLine}`;
      } else {
        secretHistoryLimit = i;
      }
    }

    // Add context and only retain up to the context limit
    context.push(truncatedLine);
    if (context.length > CONTEXT_HISTORY) context.shift();

    lineNum++;
  }

  return {
    secrets: secrets,
    highestSeverity: highestProcessedSeverity
  };
};

const removeTempFile = async () => {
  return fsPromises.unlink(TEMP_FILE);
};

exports.handler = async event => {
  const overallResult = [];

  for await (const record of event.Records) {
    const s3Event = JSON.parse(record.body);

    // Ensure at least one record is received
    if (Array.isArray(s3Event.Records) && s3Event.Records.length > 0) {
      const eventName = s3Event.Records[0].eventName;

      if (eventName.startsWith("ObjectCreated")) {
        const s3Data = s3Event.Records[0].s3;

        const bucketName = s3Data.bucket.name;
        const objectKey = s3Data.object.key;
        const eventTime = s3Event.Records[0].eventTime;

        const skipReason = await checkSkips(s3Data);
        if (skipReason) {
          console.log(skipReason);
          continue;
        }

        const successfulObjectRetrieval = await getS3Object(s3Data);
        if (!successfulObjectRetrieval) continue;

        const tests = await convertRulesJson();
        const fileStream = getFileStream();
        const result = await processFileLines(fileStream, tests, s3Data);
        overallResult.push(result.secrets);
        await removeTempFile();

        // If configured, send alert to SQS queue
        if (
          result.secrets.length > 0 &&
          possibleSeverities.indexOf(result.highestSeverity) <=
            possibleSeverities.indexOf(MINIMUM_ALERT_THRESHOLD) &&
          SQS_ALERT_URL &&
          SQS_ALERT_URL !== ""
        ) {
          console.log(`Sending to SQS: Severity: ${result.highestSeverity}`);
          const severity = result.highestSeverity;
          const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
          const alertPayload = {
            title: `Secret${
              result.secrets.length > 1 ? "s" : ""
            } Found in S3 Bucket ${bucketName}`,
            source: "S3-Secrets-Scanner",
            severity: severity,
            time_occurrence: eventTime,
            time_alerted: new Date().toISOString(),
            uniqkey: `${bucketName}_${objectKey}_${eventTime}`,
            context: {
              bucket: bucketName,
              objectKey: s3Data.object.key
            },
            recordJson: JSON.stringify(result, null, 2)
          };
          const params = {
            MessageBody: JSON.stringify(alertPayload),
            QueueUrl: SQS_ALERT_URL
          };
          await sqs.sendMessage(params).promise();
        } else {
          console.log(
            `Skipping Notification: Min Alert Threshold set to: ${MINIMUM_ALERT_THRESHOLD}; Max severity was ${result.highestSeverity}`
          );
        }

        console.log(JSON.stringify(result.secrets, null, 2));
      } else console.log(`Ignoring unsupported eventName ${eventName}`);
    } else console.log("Ignoring event with no records");
  }

  return overallResult;
};
