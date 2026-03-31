import { existsSync, readdirSync, statSync, rmSync } from 'fs';
import path from 'path';
import { getBootedSimulatorUdid } from './device';
import { parseFixtureTag } from './parse-fixture-tag';
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

  // Parse --flow <path> argument (can be specified multiple times)
  const flowArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--flow' && i + 1 < args.length) {
      flowArgs.push(args[++i]);
    }
  }

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
      if (!existsSync(resolved)) {
        console.error(`Flow path not found: ${arg}`);
        process.exit(1);
      }
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
