import { execFileSync, spawn } from 'child_process';
import { rmSync } from 'fs';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import MockServerE2E from '../../api-mocking/MockServerE2E';
import { DEFAULT_MOCKS } from '../../api-mocking/mock-responses/defaults';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { mockNotificationServices } from '../../smoke/notifications/utils/mocks';
import { buildFromTag } from '../fixtures/presets';
import { parseFixtureTag } from './parse-fixture-tag';
import { rewriteFlowForCapture } from './rewrite-flow';

const APP_BUNDLE_ID = 'io.metamask.MetaMask';

// Use the same fallback port the app defaults to when LaunchArguments are unavailable.
// This avoids the need to pass dynamic ports via xcrun simctl launch args, which
// react-native-launch-arguments doesn't reliably pick up outside of Detox.
const FIXTURE_SERVER_PORT = 12345;

// The app's shim.js defaults to this port for the mock server when LaunchArguments
// are unavailable. Matches FALLBACK_MOCKSERVER_PORT from tests/framework/Constants.ts.
const MOCK_SERVER_PORT = 8000;

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
 * Kill any stale process listening on the given port.
 * Prevents "address in use" errors and zombie servers from prior crashed runs.
 */
function killProcessOnPort(port: number): void {
  try {
    const output = execFileSync('lsof', ['-ti', `:${port}`], {
      encoding: 'utf-8',
    }).trim();
    if (output) {
      const pids = output.split('\n');
      for (const pid of pids) {
        try {
          execFileSync('kill', [pid.trim()], { stdio: 'ignore' });
        } catch {
          // Process may have already exited
        }
      }
      console.log(
        `  Killed stale process(es) on port ${port}: ${pids.join(', ')}`,
      );
    }
  } catch {
    // No process on port — nothing to kill
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
  const mockServer = new MockServerE2E({ events: DEFAULT_MOCKS });
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

    // 3. Start mock server for deterministic API responses and feature flags.
    // The app's shim.js auto-detects this via health check on localhost:8000
    // and proxies all HTTP traffic through it, giving us stable UI state.
    killProcessOnPort(MOCK_SERVER_PORT);
    mockServer.setServerPort(MOCK_SERVER_PORT);
    await mockServer.start();
    await mockNotificationServices(mockServer.server);
    await setupRemoteFeatureFlagsMock(mockServer.server);

    console.log(`  Mock server started on port ${MOCK_SERVER_PORT}`);

    // 4. Start fixture server on the well-known fallback port.
    killProcessOnPort(FIXTURE_SERVER_PORT);
    fixtureServer.setServerPort(FIXTURE_SERVER_PORT);
    await fixtureServer.start();
    fixtureServer.loadJsonState(fixture, null);
    console.log(`  Fixture server started on port ${FIXTURE_SERVER_PORT}`);

    // 5. The flow itself handles app launch via Maestro's clearState + launchApp
    //    commands, which ensures the app starts fresh and refetches from the fixture
    //    server. We just terminate any stale instance before Maestro takes over.
    terminateApp(deviceUdid);

    // 6. Determine which flow file to pass to Maestro
    let maestroFlowPath = flowPath;
    if (updateBaselines) {
      tempFlowPath = rewriteFlowForCapture(flowPath);
      maestroFlowPath = tempFlowPath;
      console.log(
        '  Mode: update-baselines (assertScreenshot -> takeScreenshot)',
      );
    }

    // 7. Run Maestro (async spawn so the Node event loop stays unblocked
    //    and the fixture/mock servers can serve requests while Maestro runs)
    const maestroPassed = await new Promise<boolean>((resolve) => {
      const child = spawn(
        'maestro',
        ['test', maestroFlowPath, '--device', deviceUdid, '--no-ansi'],
        { stdio: 'inherit' },
      );
      child.on('close', (code: number | null) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });

    return maestroPassed
      ? { flowPath, passed: true }
      : {
          flowPath,
          passed: false,
          error: 'Maestro test failed (screenshot mismatch or flow error)',
        };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { flowPath, passed: false, error: message };
  } finally {
    // Teardown — always clean up to prevent zombie processes
    terminateApp(deviceUdid);

    if (mockServer.isStarted()) {
      await mockServer.stop();
    }
    killProcessOnPort(MOCK_SERVER_PORT);

    if (fixtureServer.isStarted()) {
      await fixtureServer.stop();
    }
    killProcessOnPort(FIXTURE_SERVER_PORT);

    if (tempFlowPath) {
      try {
        rmSync(tempFlowPath);
      } catch {
        /* ignore */
      }
    }
  }
}
