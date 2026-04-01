import { existsSync, readdirSync, statSync, rmSync } from 'fs';
import path from 'path';
import { getBootedSimulatorUdid } from './device';
import { runFlow, RunFlowOptions, RunFlowResult } from './run-flow';

/**
 * Recursively discover all .yaml/.yml flow files in a directory.
 * Skips shared/ directories (those are sub-flows, not top-level test flows).
 */
export function discoverFlows(dir: string): string[] {
  const flows: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (entry !== 'shared') {
        flows.push(...discoverFlows(fullPath));
      }
    } else if (entry.endsWith('.yaml') || entry.endsWith('.yml')) {
      flows.push(fullPath);
    }
  }

  return flows;
}

export interface OrchestratorOptions {
  /** Default directory to scan when no --flow is specified */
  defaultFlowsDir: string;
  /** Directory for temp files (cleaned up automatically) */
  tmpDir: string;
  /** Optional hook to transform flows before Maestro runs them */
  transformFlow?: (flowPath: string) => string | null;
}

/**
 * Shared Maestro orchestrator CLI.
 * Parses --flow arguments, discovers flows, runs each one.
 * Fixture and mock servers are started only when flows declare the corresponding tags.
 * Can be used directly or wrapped by test-type-specific CLIs (e.g. visual).
 */
export async function orchestrate(options: OrchestratorOptions): Promise<void> {
  const { defaultFlowsDir, tmpDir, transformFlow } = options;

  const args = process.argv.slice(2);

  // Parse --flow <path> argument (can be specified multiple times)
  const flowArgs: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--flow' && i + 1 < args.length) {
      flowArgs.push(args[++i]);
    }
  }

  // Clean tmp dir at start
  rmSync(tmpDir, { recursive: true, force: true });

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
    if (!existsSync(defaultFlowsDir)) {
      console.error(`Flows directory not found: ${defaultFlowsDir}`);
      process.exit(1);
    }
    flowPaths = discoverFlows(defaultFlowsDir);
  }

  if (flowPaths.length === 0) {
    console.error('No flow files found.');
    process.exit(1);
  }

  console.log(`\nFlows: ${flowPaths.length}\n`);

  // Run each flow
  const results: RunFlowResult[] = [];
  for (const flowPath of flowPaths) {
    const relativePath = path.relative(process.cwd(), flowPath);
    console.log(`Running: ${relativePath}`);

    const flowOptions: RunFlowOptions = {
      flowPath,
      deviceUdid,
      transformFlow,
    };

    const result = await runFlow(flowOptions);
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
  rmSync(tmpDir, { recursive: true, force: true });

  if (failed > 0) {
    process.exit(1);
  }
}

// Re-export for convenience
export { runFlow } from './run-flow';
export type { RunFlowOptions, RunFlowResult } from './run-flow';
export { getBootedSimulatorUdid } from './device';
export { parseFixtureTag, parseMockTag } from './parse-tags';
