import { execFileSync, spawn } from 'child_process';
import { rmSync } from 'fs';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import MockServerE2E from '../../api-mocking/MockServerE2E';
import { DEFAULT_MOCKS } from '../../api-mocking/mock-responses/defaults';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { mockNotificationServices } from '../../smoke/notifications/utils/mocks';
import { buildFromTag } from '../fixtures/presets';
import { parseFixtureTag, parseMockTag } from './parse-tags';
import { getMockOverride } from '../mocks/registry';

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
  /**
   * Optional hook to transform the flow file before Maestro runs it.
   * Returns the path to the transformed flow (caller is responsible for cleanup).
   * If not provided, the original flow path is used.
   */
  transformFlow?: (flowPath: string) => string | null;
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
 * Execute a single Maestro flow:
 * 1. Parse fixture/mock tags from YAML — each is optional
 * 2. If fixture tag present: build fixture, start FixtureServer
 * 3. If mock tag present: start MockServerE2E with default + override mocks
 * 4. Optionally transform the flow file (e.g. rewrite screenshots)
 * 5. Run Maestro test
 * 6. Teardown: stop servers, clean up temp files
 */
export async function runFlow(options: RunFlowOptions): Promise<RunFlowResult> {
  const { flowPath, deviceUdid, transformFlow } = options;
  let fixtureServer: FixtureServer | null = null;
  let mockServer: MockServerE2E | null = null;
  let tempFlowPath: string | null = null;

  // 1. Parse tags — both are optional
  const fixtureTag = parseFixtureTag(flowPath);
  const mockTagName = parseMockTag(flowPath);

  // 2. Resolve mock override if mock tag is present
  const testSpecificMock = mockTagName
    ? getMockOverride(mockTagName)
    : undefined;
  if (mockTagName && !testSpecificMock) {
    return {
      flowPath,
      passed: false,
      error: `Unknown mock override: "${mockTagName}". Check tests/maestro/mocks/registry.ts`,
    };
  }

  try {
    // 3. Start mock server only if mock: tag is present
    if (mockTagName) {
      mockServer = new MockServerE2E({
        events: DEFAULT_MOCKS,
        testSpecificMock,
      });
      killProcessOnPort(MOCK_SERVER_PORT);
      mockServer.setServerPort(MOCK_SERVER_PORT);
      await mockServer.start();
      await mockNotificationServices(mockServer.server);
      await setupRemoteFeatureFlagsMock(mockServer.server);
      console.log(
        `  Mock server started on port ${MOCK_SERVER_PORT} (${mockTagName})`,
      );
    }

    // 4. Start fixture server only if fixture: tag is present
    if (fixtureTag) {
      const fixture = buildFromTag(fixtureTag);
      fixtureServer = new FixtureServer();
      killProcessOnPort(FIXTURE_SERVER_PORT);
      fixtureServer.setServerPort(FIXTURE_SERVER_PORT);
      await fixtureServer.start();
      fixtureServer.loadJsonState(fixture, null);
      console.log(`  Fixture server started on port ${FIXTURE_SERVER_PORT}`);
    }

    // 5. Terminate any stale app instance before Maestro takes over.
    //    The flow itself handles app launch via Maestro's clearState + launchApp.
    terminateApp(deviceUdid);

    // 6. Optionally transform the flow file (e.g. rewrite assertScreenshot → takeScreenshot)
    let maestroFlowPath = flowPath;
    if (transformFlow) {
      tempFlowPath = transformFlow(flowPath);
      if (tempFlowPath) {
        maestroFlowPath = tempFlowPath;
      }
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
    // Teardown — stop servers but leave the app running for easier debugging

    if (mockServer?.isStarted()) {
      await mockServer.stop();
    }
    if (mockTagName) {
      killProcessOnPort(MOCK_SERVER_PORT);
    }

    if (fixtureServer?.isStarted()) {
      await fixtureServer.stop();
    }
    if (fixtureTag) {
      killProcessOnPort(FIXTURE_SERVER_PORT);
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
