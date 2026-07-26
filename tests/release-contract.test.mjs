import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const guardPath = resolve(repoRoot, 'scripts/release-contract.mjs');

const makeFixture = async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), 'auth-pg-release-contract-'));
  await Promise.all(
    ['BUILD.bazel', 'MODULE.bazel', 'package.json'].map(async (name) => {
      await writeFile(resolve(fixture, name), await readFile(resolve(repoRoot, name)));
    }),
  );
  return fixture;
};

const runGuard = (cwd, overrides = {}) =>
  spawnSync(process.execPath, [guardPath], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      RELEASE_DRY_RUN: 'false',
      RELEASE_EVENT: 'release',
      RELEASE_REF: 'refs/tags/v0.2.5',
      RELEASE_TAG: 'v0.2.5',
      ...overrides,
    },
  });

test('accepts only matching immutable release and dispatch refs for non-dry publication', async () => {
  const fixture = await makeFixture();
  try {
    assert.equal(runGuard(fixture).status, 0);
    assert.equal(
      runGuard(fixture, {
        RELEASE_EVENT: 'workflow_dispatch',
        RELEASE_REF: 'refs/tags/v0.2.5',
        RELEASE_TAG: '',
      }).status,
      0,
    );

    for (const [name, environment] of [
      ['release tag mismatch', { RELEASE_TAG: 'v0.2.4' }],
      ['release ref mismatch', { RELEASE_REF: 'refs/tags/v0.2.4' }],
      [
        'manual branch dispatch',
        { RELEASE_EVENT: 'workflow_dispatch', RELEASE_REF: 'refs/heads/main', RELEASE_TAG: '' },
      ],
      [
        'manual wrong-tag dispatch',
        {
          RELEASE_EVENT: 'workflow_dispatch',
          RELEASE_REF: 'refs/tags/v0.2.4',
          RELEASE_TAG: '',
        },
      ],
    ]) {
      const result = runGuard(fixture, environment);
      assert.notEqual(result.status, 0, `${name} unexpectedly passed`);
      assert.match(result.stderr, /release contract:/);
    }

    assert.equal(
      runGuard(fixture, {
        RELEASE_DRY_RUN: 'true',
        RELEASE_EVENT: 'workflow_dispatch',
        RELEASE_REF: 'refs/heads/main',
        RELEASE_TAG: '',
      }).status,
      0,
    );
  } finally {
    await rm(fixture, { force: true, recursive: true });
  }
});

test('rejects manifest or Bazel version drift even for a dry run', async () => {
  const fixture = await makeFixture();
  try {
    const packageJsonPath = resolve(fixture, 'package.json');
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    packageJson.version = '0.2.4';
    await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

    const result = runGuard(fixture, {
      RELEASE_DRY_RUN: 'true',
      RELEASE_EVENT: 'workflow_dispatch',
      RELEASE_REF: 'refs/heads/main',
      RELEASE_TAG: '',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /package\.json version 0\.2\.4 does not match MODULE\.bazel 0\.2\.5/);
  } finally {
    await rm(fixture, { force: true, recursive: true });
  }
});

test('publish workflow gates the reusable publisher and keeps npmjs disabled', async () => {
  const workflow = await readFile(resolve(repoRoot, '.github/workflows/publish.yml'), 'utf8');

  assert.match(workflow, /^  release-contract:\n/m);
  assert.match(workflow, /^  package:\n    needs: release-contract\n/m);
  assert.match(workflow, /RELEASE_EVENT: \$\{\{ github\.event_name \}\}/);
  assert.match(workflow, /RELEASE_REF: \$\{\{ github\.ref \}\}/);
  assert.match(workflow, /RELEASE_TAG: \$\{\{ github\.event\.release\.tag_name \|\| '' \}\}/);
  assert.match(workflow, /nix develop --command just release-contract/);
  assert.match(workflow, /npm_publish_mode: disabled/);
  assert.match(workflow, /github_package_name: "@tinyland-inc\/tinyland-auth-pg"/);
  assert.doesNotMatch(workflow, /\bNPM_TOKEN:/);
});
