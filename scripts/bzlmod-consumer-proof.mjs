#!/usr/bin/env node

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = resolve(repoRoot, 'tests/bzlmod-consumer');
const workspace = resolve(repoRoot, '.artifacts/bzlmod-consumer-workspace');
const outputBase = resolve(repoRoot, '.artifacts/bzlmod-consumer-output');

const runBazel = (args, stdio = 'inherit') =>
  spawnSync('bazelisk', [`--output_base=${outputBase}`, ...args], {
    cwd: workspace,
    encoding: 'utf8',
    stdio,
  });

try {
  await rm(workspace, { force: true, recursive: true });
  await mkdir(workspace, { recursive: true });

  await Promise.all([
    cp(resolve(fixtureRoot, '.bazelrc'), resolve(workspace, '.bazelrc')),
    cp(resolve(repoRoot, '.bazelversion'), resolve(workspace, '.bazelversion')),
    cp(resolve(fixtureRoot, 'BUILD.fixture'), resolve(workspace, 'BUILD.bazel')),
    cp(resolve(fixtureRoot, 'consumer.test.mjs'), resolve(workspace, 'consumer.test.mjs')),
  ]);

  const moduleTemplate = await readFile(resolve(fixtureRoot, 'MODULE.bazel.template'), 'utf8');
  await writeFile(
    resolve(workspace, 'MODULE.bazel'),
    moduleTemplate.replace('__AUTH_PG_ROOT__', JSON.stringify(repoRoot)),
  );

  const result = runBazel(['test', '//:consumer_test', '--test_output=errors']);
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`external Bzlmod consumer proof terminated by ${result.signal}`);
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (await readFile(resolve(workspace, 'MODULE.bazel'), 'utf8').catch(() => null)) {
    runBazel(['shutdown'], 'ignore');
  }
  await rm(workspace, { force: true, recursive: true });
}
