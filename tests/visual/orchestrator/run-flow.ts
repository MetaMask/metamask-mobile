import { execFileSync } from 'child_process';
import { rmSync } from 'fs';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import { startResourceWithRetry } from '../../framework/fixtures/FixtureUtils';
import { ResourceType } from '../../framework/PortManager';
import { buildFromTag } from '../fixtures/presets';
import { parseFixtureTag } from './parse-fixture-tag';
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
