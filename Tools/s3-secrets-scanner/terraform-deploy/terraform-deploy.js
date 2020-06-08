const util = require("util");
const exec = util.promisify(require("child_process").exec);

const configFileName = "config.json";
const accounts = require(`./${configFileName}`);

const supportedOperations = ["apply", "destroy"];
const defaultOp = "apply";

const EXEC_OPTS = { timeout: 30000 };

if (
  process.argv.length === 3 &&
  process.argv[2].toLowerCase().includes("help")
) {
  console.log(
    `usage: node tf-wrapper.js [terraform command]
      terraform command: apply | destroy
      Defaults to "apply" - determines the underlying action passed to the terraform command`
  );
  process.exit(0);
}

const op =
  process.argv.length >= 3
    ? supportedOperations.indexOf(process.argv[2].toLowerCase()) > -1
      ? process.argv[2]
      : defaultOp
    : defaultOp;

const asyncForEach = async (array, cb) => {
  for (let index = 0; index < array.length; index++) {
    await cb(array[index], index, array);
  }
};

const ensureExecutables = async () => {
  try {
    await exec(`terraform --version`, EXEC_OPTS);
  } catch (err) {
    // Console message if terraform is not installed
    if (err.stderr.includes("command not found"))
      console.error("Verify Terraform is installed");

    throw err;
  }
};

const selectWorkspace = async (name) => {
  if (typeof name !== "string" || name === "")
    throw Error("Invalid Workspace Name");

  try {
    await exec(`terraform workspace new ${name}`, EXEC_OPTS);
  } catch (err) {
    // If the account already exists, continue
    if (!err.stderr.includes("already exists")) throw err;
  }

  try {
    await exec(`terraform workspace select ${name}`, EXEC_OPTS);
  } catch (err) {
    console.log(err);
  }

  return true;
};

const convertStringsArray = async (arr) => {
  let outString = "";
  await asyncForEach(arr, (e, i) => {
    outString += `${i > 0 ? "," : ""}"${e}"`;
  });
  return outString;
};

const applyTerraform = async (vars) => {
  const _combinedTags = JSON.stringify({ ...vars.tags, ...vars.region.tags });
  const _version = vars.region.lambdaFileName
    ? vars.region.lambdaFileName
    : vars.lambdaFileName
    ? vars.lambdaFileName
    : `s3-secrets-scanner_1.0.0.zip`;

  const _buckets = await convertStringsArray(vars.region.buckets);

  let command = `terraform ${op} -var='profile=${vars.profile}' -var='region=${vars.region.name}'`;
  command += ` -var=lambda_filename='${_version}' -var='buckets=[${_buckets}]'`;
  if (Object.keys(_combinedTags).length > 0)
    command += ` -var='tags=${_combinedTags}'`;
  command += ` -auto-approve`;

  console.log(`    ${command}`);
  await exec(command, { timeout: 300000 });
};

const initializeTerraform = async () => {
  console.log(`Initializing Terraform`);
  await exec(`terraform init`, { timeout: 300000 });
};

const main = async () => {
  console.log("Starting ...");

  try {
    await ensureExecutables();
    await initializeTerraform();
    console.log(`Terraform Operation: ${op}\n`);

    if (Array.isArray(accounts) && accounts.length > 0) {
      await asyncForEach(accounts, async (account) => {
        console.log(`Account: ${account.name}`);
        if (Array.isArray(account.regions) && account.regions.length > 0) {
          await asyncForEach(account.regions, async (region) => {
            if (Array.isArray(region.buckets) && region.buckets.length > 0) {
              console.log(`  Using Workspace: ${account.name}.${region.name}`);
              await selectWorkspace(`${account.name}.${region.name}`);
              await applyTerraform({
                account: account.name,
                profile: account.profile ? account.profile : "default",
                lambdaFileName: account.lambdaFileName,
                tags: account.tags,
                region: region,
              });
            } else {
              console.log(
                `  Skipping ${region.name}: No configured buckets (Check ${configFileName})`
              );
            }
          });
        } else {
          console.log(`  No configured regions (Check ${configFileName})`);
        }
        console.log("");
      });
    } else {
      console.log(`No configured accounts (Check ${configFileName})`);
    }
  } catch (err) {
    console.error(JSON.stringify(err, null, 2));
    console.log("ERROR");
    process.exit(2);
  }
  console.log("COMPLETE");
};
main();
