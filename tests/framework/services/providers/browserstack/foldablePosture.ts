import { createLogger } from '../../../logger.ts';

const logger = createLogger({ name: 'BrowserStackFoldablePosture' });

const UNFOLDED_STATE_COMMAND = 'cmd device_state state 2';
const PRINT_STATES_COMMAND = 'cmd device_state print-states';
const POSTURE_SETTLE_MS = 2_000;

export type FoldablePosture = 'folded' | 'unfolded';

export interface ConfigureFoldablePostureOptions {
  driver: WebdriverIO.Browser;
  deviceName: string;
  packageName?: string;
  posture?: string;
  settleMs?: number;
}

function browserStackAdbCommand(command: string): string {
  return `browserstack_executor: ${JSON.stringify({
    action: 'adbShell',
    arguments: { command },
  })}`;
}

/**
 * Configures an opted-in BrowserStack foldable before a performance test starts.
 *
 * BrowserStack foldable sessions always launch folded. After unfolding, restart
 * MetaMask so startup and Hermes profiling begin against the inner display
 * rather than including the initial folded render and resize transition.
 */
export async function configureFoldablePosture({
  driver: drv,
  deviceName,
  packageName,
  posture,
  settleMs = POSTURE_SETTLE_MS,
}: ConfigureFoldablePostureOptions): Promise<void> {
  if (!posture) {
    return;
  }

  if (posture !== 'unfolded') {
    throw new Error(
      `Unsupported BrowserStack foldable posture "${posture}". Expected "unfolded".`,
    );
  }

  if (!/fold/i.test(deviceName)) {
    throw new Error(
      `E2E_DEVICE_POSTURE=unfolded was set for non-foldable device "${deviceName}".`,
    );
  }

  if (!packageName) {
    throw new Error(
      'Android package name is required to restart MetaMask after unfolding.',
    );
  }

  const foldedSize = await drv.getWindowSize();

  try {
    const states = await drv.execute(
      browserStackAdbCommand(PRINT_STATES_COMMAND),
    );
    logger.info(
      `Available states for ${deviceName}: ${JSON.stringify(states)}`,
    );
    await drv.execute(browserStackAdbCommand(UNFOLDED_STATE_COMMAND));
  } catch (error) {
    throw new Error(
      `Could not unfold "${deviceName}" in BrowserStack App Automate. ` +
        'Confirm foldable posture automation is enabled for the account. ' +
        `Original error: ${String(error)}`,
    );
  }

  await new Promise((resolve) => setTimeout(resolve, settleMs));

  const unfoldedSize = await drv.getWindowSize();
  if (unfoldedSize.width <= foldedSize.width) {
    throw new Error(
      `BrowserStack reported a successful unfold for "${deviceName}", but ` +
        `the viewport width did not increase (${foldedSize.width} -> ${unfoldedSize.width}).`,
    );
  }

  await drv.terminateApp(packageName);
  await drv.activateApp(packageName);

  logger.info(
    `Unfolded ${deviceName} (${foldedSize.width}x${foldedSize.height} -> ` +
      `${unfoldedSize.width}x${unfoldedSize.height}) and restarted ${packageName}`,
  );
}
