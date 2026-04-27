# Maestro Visual Regression Orchestrator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node.js/TypeScript orchestrator that bridges the existing FixtureBuilder/FixtureServer infrastructure with Maestro visual regression test execution.

**Architecture:** The shared orchestrator (`tests/maestro/orchestrator/`) provides flow discovery, fixture/mock server lifecycle, and Maestro execution. Test-type-specific CLIs wrap it — e.g. `tests/visual/cli.ts` adds `--update-baselines` mode. The orchestrator scans YAML flows for `fixture:*` and `mock:*` tags, builds fixtures, starts MockServerE2E (port 8000) and FixtureServer (port 12345), runs `maestro test` via async spawn, and tears down.

**Tech Stack:** TypeScript, ts-node, js-yaml (already in devDeps), FixtureBuilder/FixtureServer (existing), xcrun simctl (iOS), Maestro CLI

**Proposal:** `docs/maestro-visual-regression-proposal.md`

---

## File Structure

| File                                         | Responsibility                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `tests/maestro/orchestrator/index.ts`        | Shared CLI orchestrator — flow discovery, execution loop, results reporting   |
| `tests/maestro/orchestrator/run-flow.ts`     | Single flow executor — fixture/mock servers, Maestro spawn, teardown          |
| `tests/maestro/orchestrator/parse-tags.ts`   | Extracts `fixture:*` and `mock:*` tags from Maestro YAML frontmatter          |
| `tests/maestro/orchestrator/device.ts`       | Detects booted iOS simulator UDID                                             |
| `tests/maestro/orchestrator/register.js`     | Runtime hooks — module shims for @metamask/native-utils, Detox stubs          |
| `tests/maestro/orchestrator/empty-stub.js`   | Stub for Playwright transitive imports                                        |
| `tests/maestro/fixtures/presets.ts`          | Fixture base + modifier registry, `buildFromTag()` function                   |
| `tests/maestro/mocks/registry.ts`            | Mock tag → setup function mapping                                             |
| `tests/maestro/mocks/send-balances.ts`       | Send flow mock overrides                                                      |
| `tests/visual/cli.ts`                        | Visual CLI entry point — wraps shared orchestrator, adds `--update-baselines` |
| `tests/visual/rewrite-flow.ts`               | Rewrites `assertScreenshot` → `takeScreenshot` for baseline capture           |
| `tests/visual/flows/wallet/wallet-home.yaml` | Wallet home visual flow with `fixture:default`                                |
| `tests/visual/flows/wallet/send-eth.yaml`    | Send ETH visual flow with 4 screen captures                                   |
| `tests/visual/maestro.config.yaml`           | Maestro workspace config (testOutputDir, env)                                 |

---

### Task 1: Parse Fixture Tag

**Files:**

- Create: `tests/maestro/orchestrator/parse-tags.ts`

- [ ] **Step 1: Write `parseFixtureTag`**

```typescript
// tests/maestro/orchestrator/parse-tags.ts
import yaml from 'js-yaml';
import { readFileSync } from 'fs';

/**
 * Extract the fixture tag from a Maestro flow YAML file.
 * Maestro YAML uses --- to separate config (frontmatter) from commands.
 * Returns the full tag string (e.g., "fixture:default:with-tokens") or null.
 */
export function parseFixtureTag(flowPath: string): string | null {
  const content = readFileSync(flowPath, 'utf-8');
  const configSection = content.split('---')[0];
  const config = yaml.load(configSection) as Record<string, unknown> | null;

  if (!config?.tags || !Array.isArray(config.tags)) {
    return null;
  }

  const fixtureTag = config.tags.find(
    (tag: unknown) => typeof tag === 'string' && tag.startsWith('fixture:'),
  );
  return (fixtureTag as string) ?? null;
}
```

- [ ] **Step 2: Manually test with a dummy YAML file**

Create a temp file and run:

```bash
echo 'appId: io.metamask.MetaMask
tags:
  - visual
  - fixture:default:with-tokens
---
- extendedWaitUntil:
    visible:
      id: "wallet-screen"
    timeout: 15000' > /tmp/test-flow.yaml

yarn ts-node --transpile-only -e "
const { parseFixtureTag } = require('./tests/maestro/orchestrator/parse-tags');
console.log(parseFixtureTag('/tmp/test-flow.yaml'));
"
```

Expected: `fixture:default:with-tokens`

- [ ] **Step 3: Commit**

```bash
git add tests/maestro/orchestrator/parse-tags.ts
git commit -m "feat(visual): add fixture tag parser for Maestro YAML flows"
```

---

### Task 2: Fixture Presets Registry

**Files:**

- Create: `tests/maestro/fixtures/presets.ts`

**Context:** This file imports from the existing FixtureBuilder at `tests/framework/fixtures/FixtureBuilder.ts`. The FixtureBuilder API uses method chaining: `new FixtureBuilder().withDefaultFixture().withTokens(...)`.build()`.

- [ ] **Step 1: Write the presets registry**

```typescript
// tests/maestro/fixtures/presets.ts
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import type { Fixture } from '../../framework/fixtures/types';

type FixtureFn = (fb: FixtureBuilder) => FixtureBuilder;

/**
 * Base fixtures — the starting point for a FixtureBuilder chain.
 */
const bases: Record<string, () => FixtureBuilder> = {
  default: () => new FixtureBuilder().withDefaultFixture(),
  onboarding: () => new FixtureBuilder({ onboarding: true }),
};

/**
 * Modifiers — applied in order on top of a base.
 * Each modifier receives a FixtureBuilder and returns a FixtureBuilder.
 */
const modifiers: Record<string, FixtureFn> = {
  'with-multiple-accounts': (fb) =>
    fb.withKeyringControllerOfMultipleAccounts(),
  'with-metametrics': (fb) => fb.withMetaMetricsOptIn(),
  'with-clean-banners': (fb) => fb.withCleanBannerState(),
};

/**
 * Build a Fixture from a colon-delimited tag string.
 *
 * @param tag - e.g. "fixture:default:with-tokens:with-multiple-accounts"
 * @returns Built Fixture object ready for FixtureServer.loadJsonState()
 * @throws If the base or any modifier is unknown
 */
export function buildFromTag(tag: string): Fixture {
  const segments = tag.split(':');
  const prefix = segments.shift();

  if (prefix !== 'fixture') {
    throw new Error(
      `Invalid fixture tag: "${tag}" — must start with "fixture:"`,
    );
  }

  const baseName = segments.shift();
  if (!baseName || !bases[baseName]) {
    const available = Object.keys(bases).join(', ');
    throw new Error(
      `Unknown fixture base: "${baseName}" in tag "${tag}". Available: ${available}`,
    );
  }

  let fb = bases[baseName]();

  for (const mod of segments) {
    if (!modifiers[mod]) {
      const available = Object.keys(modifiers).join(', ');
      throw new Error(
        `Unknown fixture modifier: "${mod}" in tag "${tag}". Available: ${available}`,
      );
    }
    fb = modifiers[mod](fb);
  }

  return fb.build();
}

export { bases, modifiers };
```

Note: Starting with a minimal set of modifiers. `with-tokens` is excluded for now because it needs real token addresses and balances which require more research into what the default fixture already provides. We can add it as a fast-follow once we validate the basic flow works.

- [ ] **Step 2: Verify the import compiles**

```bash
yarn ts-node --transpile-only -e "
const { buildFromTag } = require('./tests/maestro/fixtures/presets');
const fixture = buildFromTag('fixture:default');
console.log('state keys:', Object.keys(fixture.state || {}));
console.log('SUCCESS');
"
```

Expected: Prints state keys and `SUCCESS` without errors.

- [ ] **Step 3: Test error case**

```bash
yarn ts-node --transpile-only -e "
const { buildFromTag } = require('./tests/maestro/fixtures/presets');
try { buildFromTag('fixture:unknown'); } catch(e) { console.log('CAUGHT:', e.message); }
try { buildFromTag('fixture:default:bad-modifier'); } catch(e) { console.log('CAUGHT:', e.message); }
"
```

Expected: Two `CAUGHT:` lines with helpful error messages.

- [ ] **Step 4: Commit**

```bash
git add tests/maestro/fixtures/presets.ts
git commit -m "feat(visual): add fixture presets registry with base + modifier pattern"
```

---

### Task 3: Flow Rewriter (assertScreenshot -> takeScreenshot)

**Files:**

- Create: `tests/visual/rewrite-flow.ts`

**Context:** In `--update-baselines` mode, the orchestrator needs to rewrite `assertScreenshot` to `takeScreenshot` in the YAML, stripping the `.png` extension from paths. Must handle both inline and block syntax. Writes a temp file to `tests/visual/.tmp/`.

- [ ] **Step 1: Write the rewriter**

```typescript
// tests/visual/rewrite-flow.ts
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const TMP_DIR = path.join(__dirname, '..', '.tmp');

/**
 * Rewrite a Maestro flow YAML, converting assertScreenshot to takeScreenshot.
 * Strips .png extension from paths and removes thresholdPercentage.
 * Returns the path to the rewritten temp file.
 */
export function rewriteFlowForCapture(flowPath: string): string {
  mkdirSync(TMP_DIR, { recursive: true });

  let content = readFileSync(flowPath, 'utf-8');

  // Block syntax: - assertScreenshot:\n    path: foo.png
  content = content.replace(/- assertScreenshot:/g, '- takeScreenshot:');

  // Inline syntax: - assertScreenshot: foo.png
  content = content.replace(
    /- takeScreenshot:\s+([^\n]+\.png)/g,
    (_, p) => `- takeScreenshot: ${p.replace(/\.png$/, '')}`,
  );

  // Block path: path: foo.png (after the assertScreenshot -> takeScreenshot rename)
  content = content.replace(/(\s+path:\s+)([^\n]+)\.png/g, '$1$2');

  // Remove thresholdPercentage lines (not used by takeScreenshot)
  content = content.replace(/\s+thresholdPercentage:\s+\d+(\.\d+)?\n/g, '\n');

  const tempFileName = path.basename(flowPath);
  const tempPath = path.join(TMP_DIR, tempFileName);
  writeFileSync(tempPath, content, 'utf-8');

  return tempPath;
}
```

- [ ] **Step 2: Test with inline syntax**

```bash
echo '- assertScreenshot: ios/wallet/home.png' > /tmp/test-inline.yaml
yarn ts-node --transpile-only -e "
const { rewriteFlowForCapture } = require('./tests/visual/rewrite-flow');
const result = rewriteFlowForCapture('/tmp/test-inline.yaml');
const fs = require('fs');
console.log(fs.readFileSync(result, 'utf-8'));
"
```

Expected: `- takeScreenshot: ios/wallet/home`

- [ ] **Step 3: Test with block syntax**

```bash
cat > /tmp/test-block.yaml << 'EOF'
- assertScreenshot:
    path: ios/wallet/home.png
    cropOn:
      id: "wallet-screen"
    thresholdPercentage: 95
EOF
yarn ts-node --transpile-only -e "
const { rewriteFlowForCapture } = require('./tests/visual/rewrite-flow');
const result = rewriteFlowForCapture('/tmp/test-block.yaml');
const fs = require('fs');
console.log(fs.readFileSync(result, 'utf-8'));
"
```

Expected: `takeScreenshot` with `path: ios/wallet/home` (no `.png`), no `thresholdPercentage` line, `cropOn` preserved.

- [ ] **Step 4: Commit**

```bash
git add tests/visual/rewrite-flow.ts
git commit -m "feat(visual): add flow rewriter for baseline capture mode"
```

---

### Task 4: Device Detection

**Files:**

- Create: `tests/maestro/orchestrator/device.ts`

**Context:** The orchestrator needs the booted iOS simulator UDID to pass `--device` to Maestro. Uses `xcrun simctl list devices booted` to find it.

- [ ] **Step 1: Write device detection**

```typescript
// tests/maestro/orchestrator/device.ts
import { execFileSync } from 'child_process';

/**
 * Returns the UDID of the first booted iOS simulator.
 * Throws if no simulator is booted.
 */
export function getBootedSimulatorUdid(): string {
  const output = execFileSync(
    'xcrun',
    ['simctl', 'list', 'devices', 'booted', '-j'],
    {
      encoding: 'utf-8',
    },
  );

  const data = JSON.parse(output) as {
    devices: Record<
      string,
      Array<{ udid: string; state: string; name: string }>
    >;
  };

  for (const [, deviceList] of Object.entries(data.devices)) {
    for (const device of deviceList) {
      if (device.state === 'Booted') {
        return device.udid;
      }
    }
  }

  throw new Error(
    'No booted iOS simulator found. Start a simulator before running visual tests.',
  );
}
```

- [ ] **Step 2: Test (requires a booted simulator)**

```bash
yarn ts-node --transpile-only -e "
const { getBootedSimulatorUdid } = require('./tests/maestro/orchestrator/device');
console.log('UDID:', getBootedSimulatorUdid());
"
```

Expected: Prints a UDID like `49FD6DB0-BFB0-448B-9B06-2951E9886E6F`

- [ ] **Step 3: Commit**

```bash
git add tests/maestro/orchestrator/device.ts
git commit -m "feat(visual): add booted iOS simulator detection"
```

---

### Task 5: Run Flow (Single Flow Executor)

**Files:**

- Create: `tests/maestro/orchestrator/run-flow.ts`

**Context:** This is the core of the orchestrator — it executes a single Maestro flow end-to-end: build fixture, start server, launch app, run Maestro, teardown.

Key infrastructure:

- `startResourceWithRetry(ResourceType, resource)` from `tests/framework/fixtures/FixtureUtils.ts` — handles port allocation, `setServerPort()`, `start()`, and EADDRINUSE retry in one call. Returns the allocated port number.
- `FixtureServer` from `tests/framework/fixtures/FixtureServer.ts` — after `startResourceWithRetry`, call `loadJsonState(fixture, null)` to load state. `stop()` releases the port automatically via PortManager.
- We call `loadJsonState` directly (not the `loadFixture` helper from FixtureHelper.ts) because `loadFixture` also updates RPC/dapp/mock server URLs, which we don't need (no Anvil/Ganache/MockServer in visual tests).

- [ ] **Step 1: Write run-flow**

```typescript
// tests/maestro/orchestrator/run-flow.ts
import { execFileSync } from 'child_process';
import { rmSync } from 'fs';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import { startResourceWithRetry } from '../../framework/fixtures/FixtureUtils';
import { ResourceType } from '../../framework/PortManager';
import { buildFromTag } from '../fixtures/presets';
import { parseFixtureTag } from './parse-tags';
import { rewriteFlowForCapture } from './rewrite-flow';

const APP_BUNDLE_ID = 'io.metamask.MetaMask';

export interface RunFlowOptions {
  flowPath: string;
  deviceUdid: string;
  updateBaselines: boolean;
}

export interface RunFlowResult {
  flowPath: string;
  passed: boolean;
  error?: string;
}

function terminateApp(deviceUdid: string): void {
  try {
    execFileSync('xcrun', ['simctl', 'terminate', deviceUdid, APP_BUNDLE_ID], {
      stdio: 'ignore',
    });
  } catch {
    // App may not be running — ignore
  }
}

/**
 * Execute a single Maestro visual regression flow:
 * 1. Parse fixture tag from YAML
 * 2. Build fixture from presets registry
 * 3. Start FixtureServer (using startResourceWithRetry for port allocation + retry)
 * 4. Launch app with fixture server port
 * 5. Run Maestro test (or rewritten flow in update mode)
 * 6. Teardown: terminate app, stop server
 */
export async function runFlow(options: RunFlowOptions): Promise<RunFlowResult> {
  const { flowPath, deviceUdid, updateBaselines } = options;
  const fixtureServer = new FixtureServer();
  let tempFlowPath: string | null = null;

  try {
    // 1. Parse fixture tag
    const fixtureTag = parseFixtureTag(flowPath);
    if (!fixtureTag) {
      return {
        flowPath,
        passed: false,
        error: 'No fixture: tag found in flow',
      };
    }

    // 2. Build fixture
    const fixture = buildFromTag(fixtureTag);

    // 3. Start fixture server using the battle-tested startResourceWithRetry utility.
    // This handles port allocation, setServerPort, start(), and EADDRINUSE retry.
    const port = await startResourceWithRetry(
      ResourceType.FIXTURE_SERVER,
      fixtureServer,
    );

    // Load fixture state into the server.
    // Note: We call loadJsonState directly rather than the loadFixture helper from
    // FixtureHelper.ts, because loadFixture also updates RPC/dapp/mock server URLs
    // with allocated ports. Visual tests don't use Anvil/Ganache/MockServer, so
    // those URL substitutions are unnecessary and would fail (no ports allocated).
    fixtureServer.loadJsonState(fixture, null);

    console.log(`  Fixture server started on port ${port}`);

    // 4. Terminate any existing app instance, then launch with fixture port
    terminateApp(deviceUdid);

    execFileSync('xcrun', [
      'simctl',
      'launch',
      deviceUdid,
      APP_BUNDLE_ID,
      '--fixtureServerPort',
      String(port),
    ]);

    console.log(`  App launched on ${deviceUdid}`);

    // 5. Determine which flow file to pass to Maestro
    let maestroFlowPath = flowPath;
    if (updateBaselines) {
      tempFlowPath = rewriteFlowForCapture(flowPath);
      maestroFlowPath = tempFlowPath;
      console.log(
        '  Mode: update-baselines (assertScreenshot -> takeScreenshot)',
      );
    }

    // 6. Run Maestro
    try {
      execFileSync(
        'maestro',
        ['test', maestroFlowPath, '--device', deviceUdid, '--no-ansi'],
        { stdio: 'inherit' },
      );

      return { flowPath, passed: true };
    } catch {
      return {
        flowPath,
        passed: false,
        error: 'Maestro test failed (screenshot mismatch or flow error)',
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { flowPath, passed: false, error: message };
  } finally {
    // Teardown
    terminateApp(deviceUdid);

    if (fixtureServer.isStarted()) {
      await fixtureServer.stop();
    }

    if (tempFlowPath) {
      try {
        rmSync(tempFlowPath);
      } catch {
        /* ignore */
      }
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
yarn ts-node --transpile-only -e "
const { runFlow } = require('./tests/maestro/orchestrator/run-flow');
console.log('runFlow imported:', typeof runFlow);
"
```

Expected: `runFlow imported: function`

- [ ] **Step 3: Commit**

```bash
git add tests/maestro/orchestrator/run-flow.ts
git commit -m "feat(visual): add single flow executor with fixture server lifecycle"
```

---

### Task 6: CLI Entry Point

**Files:**

- Create: `tests/maestro/orchestrator/index.ts`

**Context:** The main CLI that ties everything together. Discovers flows, runs each one, reports results.

- [ ] **Step 1: Write the CLI entry point**

```typescript
// tests/maestro/orchestrator/index.ts
import { readdirSync, statSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { getBootedSimulatorUdid } from './device';
import { parseFixtureTag } from './parse-tags';
import { runFlow, RunFlowResult } from './run-flow';

const FLOWS_DIR = path.join(__dirname, '..', 'flows');
const TMP_DIR = path.join(__dirname, '..', '.tmp');

/**
 * Recursively discover all .yaml files in a directory.
 */
function discoverFlows(dir: string): string[] {
  const flows: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      // Skip shared/ — those are sub-flows, not top-level test flows
      if (entry !== 'shared') {
        flows.push(...discoverFlows(fullPath));
      }
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      // Only include flows that have a fixture tag
      const tag = parseFixtureTag(fullPath);
      if (tag) {
        flows.push(fullPath);
      }
    }
  }

  return flows;
}

async function main() {
  const args = process.argv.slice(2);
  const updateBaselines = args.includes('--update-baselines');
  const flowArgs = args.filter((a) => !a.startsWith('--'));

  // Clean tmp dir at start
  rmSync(TMP_DIR, { recursive: true, force: true });

  // Detect device
  let deviceUdid: string;
  try {
    deviceUdid = getBootedSimulatorUdid();
    console.log(`Using simulator: ${deviceUdid}`);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  // Discover flows
  let flowPaths: string[];
  if (flowArgs.length > 0) {
    // Specific flow or directory passed as argument
    flowPaths = [];
    for (const arg of flowArgs) {
      const resolved = path.resolve(arg);
      if (statSync(resolved).isDirectory()) {
        flowPaths.push(...discoverFlows(resolved));
      } else {
        flowPaths.push(resolved);
      }
    }
  } else {
    flowPaths = discoverFlows(FLOWS_DIR);
  }

  if (flowPaths.length === 0) {
    console.error('No flows with fixture: tags found.');
    process.exit(1);
  }

  const mode = updateBaselines ? 'update-baselines' : 'assert';
  console.log(`\nMode: ${mode}`);
  console.log(`Flows: ${flowPaths.length}\n`);

  // Run each flow
  const results: RunFlowResult[] = [];
  for (const flowPath of flowPaths) {
    const relativePath = path.relative(process.cwd(), flowPath);
    console.log(`Running: ${relativePath}`);

    const result = await runFlow({
      flowPath,
      deviceUdid,
      updateBaselines,
    });

    results.push(result);

    if (result.passed) {
      console.log(`  PASS\n`);
    } else {
      console.log(`  FAIL: ${result.error}\n`);
    }
  }

  // Report summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('---');
  console.log(
    `Results: ${passed} passed, ${failed} failed, ${results.length} total`,
  );

  // Clean tmp dir at end
  rmSync(TMP_DIR, { recursive: true, force: true });

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Orchestrator error:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify it compiles and shows help-like output with no flows**

```bash
yarn ts-node --transpile-only tests/maestro/orchestrator/index.ts 2>&1 || true
```

Expected: Either "No flows with fixture: tags found." (if no flows exist yet) or starts running.

- [ ] **Step 3: Commit**

```bash
git add tests/maestro/orchestrator/index.ts
git commit -m "feat(visual): add orchestrator CLI entry point"
```

---

### Task 7: Maestro Config and Sample Flow

**Files:**

- Create: `tests/visual/maestro.config.yaml`
- Create: `tests/visual/flows/wallet/wallet-home.yaml`

- [ ] **Step 1: Write maestro.config.yaml**

```yaml
# tests/visual/maestro.config.yaml
#
# Maestro workspace configuration for visual regression tests.
# See: https://docs.maestro.dev/maestro-flows/workspace-management/project-configuration
#
testOutputDir: baselines
```

- [ ] **Step 2: Write the first flow**

```yaml
# tests/visual/flows/wallet/wallet-home.yaml
#
# Visual regression test for the wallet home screen in its default state.
# Fixture provides a pre-configured wallet with default account and networks.
#
appId: io.metamask.MetaMask
tags:
  - visual
  - fixture:default
---
# Wait for wallet home to load (fixture provides logged-in state).
# This also ensures the screen has settled before the conditional runFlow below,
# since runFlow's when: visible: check is instant and does not wait.
#
# testID from: e2e/selectors/wallet/WalletView.selectors.js or similar
- extendedWaitUntil:
    visible:
      id: 'wallet-screen'
    timeout: 15000

# Capture wallet home — tokens tab (default view)
- assertScreenshot:
    path: ios/wallet/home-default.png
    cropOn:
      id: 'wallet-screen'
    thresholdPercentage: 95
```

- [ ] **Step 3: Create baselines directory structure**

```bash
mkdir -p tests/visual/baselines/ios/wallet
```

- [ ] **Step 4: Add .gitignore for .tmp/**

```bash
echo '.tmp/' > tests/visual/.gitignore
```

- [ ] **Step 5: Commit**

```bash
git add tests/visual/maestro.config.yaml tests/visual/flows/wallet/wallet-home.yaml tests/visual/baselines/.gitkeep tests/visual/.gitignore
git commit -m "feat(visual): add maestro config, sample wallet-home flow, and baselines dir"
```

---

### Task 8: Package.json Scripts

**Files:**

- Modify: `package.json` (add 2 scripts)

- [ ] **Step 1: Add scripts to package.json**

Add these to the `"scripts"` section:

```json
"maestro:visual": "ts-node --transpile-only -r ./tests/maestro/orchestrator/register.js tests/visual/cli.ts",
"maestro:visual:update-baselines": "ts-node --transpile-only -r ./tests/maestro/orchestrator/register.js tests/visual/cli.ts --update-baselines"
```

- [ ] **Step 2: Verify the script runs**

```bash
yarn maestro:visual 2>&1 | head -5
```

Expected: Output from the orchestrator (simulator detection, flow discovery, etc.)

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(visual): add maestro:visual and maestro:visual:update-baselines scripts"
```

---

### Task 9: End-to-End Smoke Test

This task validates the full pipeline with a real simulator and installed app. It requires:

- A booted iOS simulator
- The MetaMask app built and installed with E2E/QA configuration
- Maestro CLI v2.2.0+ installed

- [ ] **Step 1: Run update-baselines to capture initial baseline**

```bash
yarn maestro:visual:update-baselines tests/visual/flows/wallet/wallet-home.yaml
```

Expected: Orchestrator starts, builds `fixture:default`, starts FixtureServer, launches app, Maestro captures screenshot to `tests/visual/baselines/ios/wallet/home-default.png`.

- [ ] **Step 2: Verify baseline was captured**

```bash
ls -la tests/visual/baselines/ios/wallet/home-default.png
```

- [ ] **Step 3: Run assert mode**

```bash
yarn maestro:visual tests/visual/flows/wallet/wallet-home.yaml
```

Expected: Orchestrator runs the flow with `assertScreenshot`, compares against baseline, reports PASS.

- [ ] **Step 4: Fix any issues found during smoke test**

Address any problems with:

- Launch argument passing (`fixtureServerPort`)
- App readiness timing
- Maestro screenshot directory resolution
- FixtureServer port allocation

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(visual): address issues found during orchestrator smoke test"
```

---

### Task 10: Mock Server Integration

**Files:**

- Modify: `tests/maestro/orchestrator/run-flow.ts`

**Context:** Without a mock server, the E2E app's `shim.js` routes all HTTP traffic to real MetaMask API endpoints. This causes:

1. **Flaky tests** — real API calls are slow and unreliable, causing timeouts
2. **Non-deterministic UI** — production feature flags control promos, banners, and modals (e.g. "Perps are here") that change the UI unpredictably
3. **Fragile baselines** — every new feature-flagged overlay requires a new dismissal step in flows

The existing Detox infrastructure already solves this via `MockServerE2E` (a `mockttp` proxy server) + `DEFAULT_MOCKS` (responses for ~30 API endpoint groups) + `setupRemoteFeatureFlagsMock` (deterministic feature flags). The app's `shim.js` auto-detects the mock server via a health check to `localhost:<port>/health-check` and patches `global.fetch` + `XMLHttpRequest` to proxy all traffic through it.

**How it works in Detox (from `FixtureHelper.ts:createMockAPIServer`):**

```typescript
const mockServerInstance = new MockServerE2E({ events: DEFAULT_MOCKS });
const mockServerPort = await startResourceWithRetry(
  ResourceType.MOCK_SERVER,
  mockServerInstance,
);
await mockNotificationServices(mockServerInstance.server);
await setupRemoteFeatureFlagsMock(mockServerInstance.server);
```

**For visual tests we need:**

- Start `MockServerE2E` on port 8000 (`FALLBACK_MOCKSERVER_PORT`) — same fixed-port pattern as the fixture server, since `shim.js` defaults to this port when `LaunchArguments` aren't available
- Load `DEFAULT_MOCKS` for baseline API responses
- Call `setupRemoteFeatureFlagsMock` for deterministic feature flags
- Call `mockNotificationServices` to prevent notification-related network calls
- Clean up (stop + kill port) in the `finally` block alongside the fixture server

**Key port detail:** The app's `shim.js` reads `mockServerPort` from LaunchArguments (which don't work outside Detox) and falls back to `defaultMockPort` from `tests/api-mocking/mock-config/mockUrlCollection.json`. That default is `8000`. So we bind to port 8000, matching what the fixture server approach does with port 12345.

- [ ] **Step 1: Add mock server startup and teardown to `run-flow.ts`**

Add these imports at the top of `run-flow.ts`:

```typescript
import MockServerE2E from '../../api-mocking/MockServerE2E';
import { DEFAULT_MOCKS } from '../../api-mocking/mock-responses/defaults';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { mockNotificationServices } from '../../smoke/notifications/utils/mocks';
```

Add `MOCK_SERVER_PORT` constant:

```typescript
const MOCK_SERVER_PORT = 8000;
```

In the `runFlow` function, after building the fixture and before starting the fixture server:

```typescript
// 3. Start mock server for deterministic API responses and feature flags.
// The app's shim.js auto-detects this via health check and proxies all
// HTTP traffic through it, giving us stable, fast, predictable UI state.
killProcessOnPort(MOCK_SERVER_PORT);
const mockServer = new MockServerE2E({ events: DEFAULT_MOCKS });
mockServer.setServerPort(MOCK_SERVER_PORT);
await mockServer.start();
await mockNotificationServices(mockServer.server);
await setupRemoteFeatureFlagsMock(mockServer.server);
console.log(`  Mock server started on port ${MOCK_SERVER_PORT}`);
```

In the `finally` teardown block, add mock server cleanup:

```typescript
if (mockServer.isStarted()) {
  await mockServer.stop();
}
killProcessOnPort(MOCK_SERVER_PORT);
```

Note: `mockServer` must be declared in the outer scope (alongside `fixtureServer`) so the `finally` block can access it.

- [ ] **Step 2: Verify the mock server is detected by the app**

Run:

```bash
yarn maestro:visual:update-baselines tests/visual/flows/wallet/wallet-home.yaml
```

Check Metro console output for:

```
[E2E SHIM] Mock server connected via localhost
```

If this line appears (instead of "health check failed"), the app is proxying traffic through our mock server.

- [ ] **Step 3: Verify feature flags are now deterministic**

After the mock server is integrated, the "Perps are here" promo and similar feature-flagged overlays should no longer appear (they'll be controlled by the mock's feature flag response instead of production). The existing `runFlow: when: visible: "Not now"` dismissal in `wallet-home.yaml` acts as a safety net but shouldn't be needed once flags are mocked.

- [ ] **Step 4: Commit**

```bash
git add tests/maestro/orchestrator/run-flow.ts
git commit -m "feat(visual): add MockServerE2E for deterministic API responses and feature flags"
```

---

### Task 11: Update wallet-home flow for mock server

**Files:**

- Modify: `tests/visual/flows/wallet/wallet-home.yaml`

**Context:** With the mock server providing deterministic feature flags, the promo overlay dismissal may no longer be needed. However, we should keep it as a conditional safety net and verify the baseline screenshot is clean and stable.

- [ ] **Step 1: Run update-baselines twice and compare**

```bash
yarn maestro:visual:update-baselines tests/visual/flows/wallet/wallet-home.yaml
# Save the first baseline
cp <baseline-path>/home-default.png /tmp/baseline-1.png

yarn maestro:visual:update-baselines tests/visual/flows/wallet/wallet-home.yaml
# Compare
diff <baseline-path>/home-default.png /tmp/baseline-1.png
```

If the screenshots are identical (or very close), the mock server is providing stable state.

- [ ] **Step 2: Run assert mode to verify comparison works**

```bash
yarn maestro:visual tests/visual/flows/wallet/wallet-home.yaml
```

Expected: PASS (screenshot matches baseline within 95% threshold).

- [ ] **Step 3: Commit any flow adjustments**

```bash
git add tests/visual/flows/wallet/wallet-home.yaml
git commit -m "fix(visual): stabilize wallet-home flow with mock server"
```

---

## Execution Notes

- Tasks 1-4 are independent and can be implemented in parallel
- Task 5 depends on Tasks 1-4
- Task 6 depends on Task 5
- Tasks 7-8 are independent of each other but should come after Task 6
- Task 9 requires all previous tasks and a running simulator with the app installed
- Tasks 1-9 are COMPLETE
- Task 10 (mock server) depends on Task 9 (needs a working pipeline to validate against)
- Task 11 depends on Task 10

## Lessons Learned (from Task 9 smoke testing)

These issues were discovered and fixed during the smoke test. They inform the current implementation but are not in the original plan:

1. **`execFileSync` blocks the event loop** — Must use `spawn()` (async) for Maestro so the fixture server (Koa) can serve HTTP requests while Maestro runs
2. **Fixed ports required** — `react-native-launch-arguments` doesn't work outside Detox. Fixture server uses port 12345 (`FALLBACK_FIXTURE_SERVER_PORT`), mock server will use port 8000 (`FALLBACK_MOCKSERVER_PORT`)
3. **Stale port cleanup is essential** — Zombie processes from crashed runs hold ports. `killProcessOnPort()` runs before start and in `finally` teardown
4. **`clearState` + `launchApp` required in flows** — Ensures `ReadOnlyNetworkStore._initialized` resets so it refetches from the fixture server
5. **Default fixture password is `123123123`** — Not `12345678`
6. **Dev menu dismissal** — Tap server row → wait for Continue → tap Continue → tap X at coordinates `93%,37%`
7. **`register.js` shims** — ESM-only `@metamask/native-utils` needs Module.\_resolveFilename redirect; `global.device` stub needed for PlatformDetector
8. **`takeScreenshot` doesn't support `cropOn`** — Only `assertScreenshot` does
9. **Dev menu dismissal improved** — Use `fast-refresh` testID instead of coordinates (`93%,37%`) for reliability across device sizes

---

## Next Steps

### Task 12: Add Send ETH Visual Flow

Add a visual regression flow for the send ETH flow, capturing 4 screens: asset selection, amount input, recipient input, and transaction confirmation/review.

**Files:**

- Create: `tests/visual/flows/wallet/send-eth.yaml`

**Context:** The send flow navigation is: wallet home → asset selection → amount input → recipient → confirmation review. The Detox E2E tests (`tests/smoke/confirmations/send/send-native-token.spec.ts`) follow the same sequence using page objects. Our visual flow replicates this navigation using Maestro commands and captures a screenshot at each screen.

**TestIDs used** (from `RedesignedSendView.testIds.ts` and `ConfirmationView.testIds.ts`):

| TestID                        | Screen                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `wallet-send-button`          | Wallet home — entry point                                                    |
| `pay-with-token-list`         | Asset selection — token list                                                 |
| `send_amount`                 | Amount input — amount display                                                |
| `percentage-button-100`       | Amount input — max amount button                                             |
| `recipient-address-input`     | Recipient — address input field                                              |
| `review-button`               | Recipient — proceed to review                                                |
| `flat-confirmation-container` | Confirmation — review screen container                                       |
| `confirm-button`              | Confirmation — footer confirm button (NOT tapped, just used as ready signal) |

**Recipient address:** `0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb` (same as Detox tests)

**Balance:** The default fixture has `balance: "0x0"` in `AccountTrackerController`, but `MockServerE2E` + `DEFAULT_MOCKS` mock the accounts API to return 0.5 ETH (`tests/api-mocking/mock-responses/defaults/accounts.ts:1297`). The app fetches balance from this API, so the send flow should have funds available. If balance still shows 0, add a `with-eth-balance` modifier to `tests/maestro/fixtures/presets.ts` that sets `AccountTrackerController.accountsByChainId` to a non-zero value.

**Risk:** The confirmation screen requires gas estimation API responses. `MockServerE2E` + `DEFAULT_MOCKS` should cover this (they mock `transaction.api.cx.metamask.io/networks/*/getFees` and Tenderly simulation). If the confirmation screen doesn't render, drop the last screenshot and stop at recipient.

- [ ] **Step 1: Write the flow YAML**

```yaml
# tests/visual/flows/wallet/send-eth.yaml
#
# Visual regression test for the send ETH flow.
# Captures 4 screens: asset selection, amount input, recipient, confirmation.
# Fixture provides a pre-configured wallet with default account and networks.
appId: io.metamask.MetaMask
tags:
  - visual
  - fixture:default
---
# Clear app state and relaunch so ReadOnlyNetworkStore refetches from fixture server.
- clearState
- launchApp

# Dismiss developer screens (debug builds only)
- runFlow: ../shared/dismiss-dev-screens.yaml

# Unlock the app with fixture default password
- runFlow: ../shared/unlock-app.yaml

# --- Screen 1: Asset Selection ---

- tapOn:
    id: 'wallet-send-button'

- extendedWaitUntil:
    visible:
      id: 'pay-with-token-list'
    timeout: 15000

- assertScreenshot:
    path: ios/wallet/send-asset-selection.png
    thresholdPercentage: 95

# --- Screen 2: Amount Input ---

- tapOn: 'Ethereum'

- extendedWaitUntil:
    visible:
      id: 'send_amount'
    timeout: 15000

- assertScreenshot:
    path: ios/wallet/send-amount-input.png
    thresholdPercentage: 95

# --- Screen 3: Recipient Input ---

- tapOn:
    id: 'percentage-button-100'
- tapOn: 'Continue'

- extendedWaitUntil:
    visible:
      id: 'recipient-address-input'
    timeout: 15000

- assertScreenshot:
    path: ios/wallet/send-recipient-input.png
    thresholdPercentage: 95

# --- Screen 4: Confirmation / Review ---

- tapOn:
    id: 'recipient-address-input'
- inputText: '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb'
- hideKeyboard

# Short wait for keyboard dismiss animation to complete
- wait: 1000

# Wait for review button to become visible (address validation is async)
- extendedWaitUntil:
    visible:
      id: 'review-button'
    timeout: 15000

# Short wait for animations to settle (Detox uses waitForElementToStopMoving here)
- wait: 1000
- tapOn:
    id: 'review-button'

# Wait for the confirmation screen to fully render
- extendedWaitUntil:
    visible:
      id: 'flat-confirmation-container'
    timeout: 30000

# Wait for confirm button as a signal the screen is fully loaded
- extendedWaitUntil:
    visible:
      id: 'confirm-button'
    timeout: 15000

- assertScreenshot:
    path: ios/wallet/send-confirmation.png
    thresholdPercentage: 95
```

- [ ] **Step 2: Create baseline directory**

```bash
mkdir -p tests/visual/baselines/ios/wallet
```

(Should already exist from wallet-home, but ensure it's there.)

- [ ] **Step 3: Run update-baselines to capture initial baselines**

```bash
yarn maestro:visual:update-baselines --flow tests/visual/flows/wallet/send-eth.yaml
```

Expected: Orchestrator starts, builds `fixture:default`, starts FixtureServer + MockServerE2E, launches app, Maestro navigates through send flow capturing 4 screenshots.

Watch for:

- Asset selection screen loads with token list
- Amount screen shows after tapping Ethereum
- Recipient screen shows after tapping 100% + Continue
- Confirmation screen renders after entering address + tapping Review
- If confirmation screen fails (gas estimation not mocked properly), remove the last screenshot section and re-run

- [ ] **Step 4: Verify baselines were captured**

```bash
ls -la tests/visual/baselines/ios/wallet/send-*.png
```

Expected: 4 files (`send-asset-selection.png`, `send-amount-input.png`, `send-recipient-input.png`, `send-confirmation.png`). If only 3, the confirmation screen didn't work — see risk note above.

- [ ] **Step 5: Run assert mode to verify screenshots match**

```bash
yarn maestro:visual --flow tests/visual/flows/wallet/send-eth.yaml
```

Expected: PASS — all screenshots match baselines within 95% threshold.

- [ ] **Step 6: Fix any issues found during testing**

Address any problems with:

- Timing (increase timeouts if screens load slowly)
- Keyboard dismissal (may need `hideKeyboard` after input)
- Review button not becoming visible (address validation async)
- Confirmation screen not rendering (mock server coverage)

- [ ] **Step 7: Commit**

```bash
git add tests/visual/flows/wallet/send-eth.yaml
git commit -m "feat(visual): add send ETH visual regression flow with 4 screen captures"
```

---

### Task 13: Add Android Support

Extend the orchestrator to support Android emulators alongside iOS simulators.

**Areas to address:**

- `device.ts` — detect booted Android emulator via `adb devices` (in addition to `xcrun simctl`)
- `run-flow.ts` — use `adb shell am force-stop` instead of `xcrun simctl terminate`
- CLI — add `--platform android|ios` flag or auto-detect based on available devices
- Flows — Android may need different `appId` (`io.metamask.MetaMask.debug` vs `io.metamask.MetaMask`)
- Baselines — separate baseline paths per platform (`ios/` vs `android/`)

---

### Task 14: Explore Guardrails for Specific Emulator/Simulator

Screenshots vary across device models, OS versions, and screen sizes. We need guardrails to ensure baselines are generated and asserted on a consistent environment.

**Areas to explore:**

- Pin a canonical device model + OS version for CI (e.g. iPhone 16 Pro + iOS 18.4)
- Validate the booted simulator matches the expected device before running flows — fail fast with a clear error if mismatched
- Store device/OS metadata alongside baselines so stale baselines from a different environment are flagged
- Consider per-device baseline directories (e.g. `baselines/iPhone-16-Pro-iOS-18.4/`)
- Dark mode vs light mode — may need separate fixture presets and baseline sets

---

### Task 15: Explore Baseline Management

Maestro has no built-in baseline management. We need a strategy for storing, updating, and reviewing baselines.

**Areas to explore:**

- **Storage**: commit to repo (visible in PR diffs, but binary bloat) vs external storage (S3, Git LFS)
- **Update workflow**: who generates baselines, how are they reviewed (PR diff? separate approval step?)
- **Staleness**: how to detect baselines generated on a different device/OS than CI
- **CI integration**: generate baselines in CI on a pinned simulator, assert against them on every PR
- **Diff visualization**: Maestro generates comparison images on failure — surface these in CI artifacts or PR comments

9. **Rewritten flows need absolute `runFlow` paths** — Temp files in `.tmp/` break relative paths
