# Typed analytics contract check

This tooling downloads the deployed Mobile analytics contract, verifies its
release metadata, generates the Quick Buy v1/v2 pilot in a temporary directory,
and type-checks the generated API. Local runs retain these files in the
gitignored `temp/local-analytics-contract-check/` directory by default.

It does not modify application code. CI runs that receive already-downloaded
paths clean their generated temporary files unless `--keep` or
`--output-directory` is provided.

## Local usage

The local command uses the GitHub CLI authentication already configured on the
machine. Confirm access first:

```sh
gh auth status
```

Check the newest published analytics release:

```sh
yarn analytics:contract:check
```

Check a specific release:

```sh
yarn analytics:contract:check \
  --release-tag analytics-contracts-67390efdfde3-8db9e9f80441
```

Check the pinned release metadata:

```sh
yarn analytics:contract:check:locked
```

Use a different directory for the retained files:

```sh
yarn analytics:contract:check \
  --output-directory temp/my-analytics-contract-check
```

Compare the strict pilot with pinned stock Typewriter locally:

```sh
yarn analytics:contract:compare
```

The comparison uses TypeScript with `analytics-react-native`, the exact lock
fixture, and a local `plan.json`. It does not update Segment or require a
Segment API token. Typewriter output and the comparison report remain under
the ignored `temp/analytics-contract-comparison/` directory.

The reviewed Quick Buy facade is tracked publicly under
`app/util/analytics/generated/`. CI regenerates it and compares the result to
the tracked files. The `.test-d.ts` file checks compile-time contracts; the
generated `.test.ts` file covers runtime event-name and version-context
forwarding.

The command fails if release verification, Quick Buy v1/v2 generation, or the
generated TypeScript checks fail.
