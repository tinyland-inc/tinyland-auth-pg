set shell := ["bash", "-euo", "pipefail", "-c"]

root := justfile_directory()
build_targets := "//:tinyland-auth-pg //:typecheck //:pkg"
test_targets := "//:test //:package_authority_test //:package_artifact_test //:auth_runtime_link_test //:release_contract_test"

default:
    @just --list --unsorted

info:
    cd {{ root }} && bazelisk info release

flake-check:
    cd {{ root }} && nix flake check --no-build

format-check:
    cd {{ root }} && nix fmt -- --check flake.nix

setup:
    cd {{ root }} && pnpm install --frozen-lockfile

clean:
    cd {{ root }} && rm -rf dist

publish-guard:
    @echo "Refusing source-tree publication; publish the validated Bazel //:pkg artifact through the release workflow." >&2
    @exit 1

release-contract:
    cd {{ root }} && node scripts/release-contract.mjs

release-contract-test:
    cd {{ root }} && bazelisk test //:release_contract_test --test_output=errors

bzlmod-consumer-proof:
    cd {{ root }} && node scripts/bzlmod-consumer-proof.mjs

bazel-graph:
    cd {{ root }} && bazelisk mod graph

bazel-query *args:
    cd {{ root }} && bazelisk query {{ args }}

lock:
    cd {{ root }} && pnpm install --lockfile-only

build:
    cd {{ root }} && bazelisk build //:tinyland-auth-pg

typecheck:
    cd {{ root }} && bazelisk build //:typecheck

package:
    cd {{ root }} && bazelisk build //:pkg

test-unit:
    cd {{ root }} && bazelisk test {{ test_targets }} --test_output=errors

test: test-unit

package-authority:
    cd {{ root }} && bazelisk test //:package_authority_test //:release_contract_test --test_output=errors

package-smoke:
    cd {{ root }} && bazelisk test //:package_artifact_test //:auth_runtime_link_test --test_output=errors

package-check: package package-smoke bzlmod-consumer-proof
    cd {{ root }} && pnpm exec publint bazel-bin/pkg

db-generate:
    cd {{ root }} && pnpm exec drizzle-kit generate

db-migrate:
    cd {{ root }} && pnpm exec drizzle-kit migrate

db-push:
    cd {{ root }} && pnpm exec drizzle-kit push

db-push-public:
    cd {{ root }} && pnpm exec drizzle-kit push --config=drizzle.public.config.ts

check:
    cd {{ root }} && bazelisk build {{ build_targets }}
    cd {{ root }} && bazelisk test {{ test_targets }} --test_output=errors
    cd {{ root }} && pnpm exec publint bazel-bin/pkg

ci: flake-check format-check bazel-graph check
