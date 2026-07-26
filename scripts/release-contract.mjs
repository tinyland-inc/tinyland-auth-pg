#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const fail = (message) => {
  throw new Error(`release contract: ${message}`);
};

const requiredMatch = (contents, pattern, description) => {
  const match = contents.match(pattern);
  if (!match) {
    fail(`${description} not found`);
  }
  return match[1];
};

const readContract = async () => {
  const [moduleBazel, buildBazel, packageJsonText] = await Promise.all([
    readFile('MODULE.bazel', 'utf8'),
    readFile('BUILD.bazel', 'utf8'),
    readFile('package.json', 'utf8'),
  ]);
  const packageJson = JSON.parse(packageJsonText);
  const moduleBlock = requiredMatch(
    moduleBazel,
    /module\(([\s\S]*?)\)/,
    'MODULE.bazel module() declaration',
  );
  const packageBlock = requiredMatch(
    buildBazel,
    /npm_package\(\s*name\s*=\s*"pkg",([\s\S]*?)\n\)/,
    'BUILD.bazel npm_package(name = "pkg") declaration',
  );

  return {
    bazelPackage: requiredMatch(
      packageBlock,
      /package\s*=\s*"([^"]+)"/,
      'BUILD.bazel package identity',
    ),
    bazelVersion: requiredMatch(
      packageBlock,
      /version\s*=\s*"([^"]+)"/,
      'BUILD.bazel package version',
    ),
    manifestPackage: packageJson.name,
    manifestVersion: packageJson.version,
    moduleName: requiredMatch(
      moduleBlock,
      /name\s*=\s*"([^"]+)"/,
      'MODULE.bazel module name',
    ),
    moduleVersion: requiredMatch(
      moduleBlock,
      /version\s*=\s*"([^"]+)"/,
      'MODULE.bazel module version',
    ),
  };
};

const validateStaticContract = (contract) => {
  const expectedModule = 'tummycrypt_tinyland_auth_pg';
  const expectedPackage = '@tummycrypt/tinyland-auth-pg';

  if (contract.moduleName !== expectedModule) {
    fail(`MODULE.bazel name ${contract.moduleName} does not match ${expectedModule}`);
  }
  if (contract.manifestPackage !== expectedPackage) {
    fail(`package.json name ${contract.manifestPackage} does not match ${expectedPackage}`);
  }
  if (contract.bazelPackage !== expectedPackage) {
    fail(`BUILD.bazel package ${contract.bazelPackage} does not match ${expectedPackage}`);
  }
  if (contract.manifestVersion !== contract.moduleVersion) {
    fail(
      `package.json version ${contract.manifestVersion} does not match MODULE.bazel ${contract.moduleVersion}`,
    );
  }
  if (contract.bazelVersion !== contract.moduleVersion) {
    fail(
      `BUILD.bazel version ${contract.bazelVersion} does not match MODULE.bazel ${contract.moduleVersion}`,
    );
  }
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(contract.moduleVersion)) {
    fail(`MODULE.bazel version ${contract.moduleVersion} is not a release version`);
  }
};

const parseDryRun = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  fail(`RELEASE_DRY_RUN must be exactly true or false, got ${JSON.stringify(value)}`);
};

const validateTrigger = (version) => {
  const event = process.env.RELEASE_EVENT;
  const ref = process.env.RELEASE_REF;
  const tag = process.env.RELEASE_TAG ?? '';
  const dryRun = parseDryRun(process.env.RELEASE_DRY_RUN);
  const expectedTag = `v${version}`;
  const expectedRef = `refs/tags/${expectedTag}`;

  if (event === 'release') {
    if (tag !== expectedTag) {
      fail(`release tag ${JSON.stringify(tag)} does not match ${expectedTag}`);
    }
    if (ref !== expectedRef) {
      fail(`release ref ${JSON.stringify(ref)} does not match ${expectedRef}`);
    }
  } else if (event === 'workflow_dispatch') {
    if (!dryRun && ref !== expectedRef) {
      fail(`non-dry workflow_dispatch ref ${JSON.stringify(ref)} does not match ${expectedRef}`);
    }
  } else {
    fail(`unsupported trigger ${JSON.stringify(event)}`);
  }

  return { dryRun, event, expectedRef };
};

try {
  const contract = await readContract();
  validateStaticContract(contract);
  const trigger = validateTrigger(contract.moduleVersion);
  console.log(
    `release contract: ${contract.moduleName}@${contract.moduleVersion}; ${trigger.event}; ${trigger.dryRun ? 'dry-run' : trigger.expectedRef}`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : `release contract: ${String(error)}`);
  process.exitCode = 1;
}
