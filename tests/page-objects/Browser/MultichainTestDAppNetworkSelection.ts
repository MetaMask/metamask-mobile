import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import { MultichainTestDappViewSelectorsIDs } from '../../selectors/Browser/MultichainTestDapp.selectors.js';
import MultichainUtilities from '../../helpers/multichain/MultichainUtilities.js';
import { createLogger } from '../../framework/logger.js';

const logger = createLogger({
  name: 'MultichainTestDAppNetworkSelection',
});

const SELECTORS = MultichainTestDappViewSelectorsIDs;
export const MULTICHAIN_TEST_DAPP_BASE_URL = `http://localhost:8093`;

const CHECKBOX_SETTLE_TIMEOUT_MS = 10_000;
const SELECTION_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 250;

export type CheckboxState =
  | 'checked'
  | 'unchecked'
  | 'checked-disabled'
  | 'unchecked-disabled'
  | 'missing';

export type ConnectionState = 'enabled' | 'disabled' | 'missing' | 'unreadable';

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const checkboxIdFor = (chainId: string): string =>
  `${SELECTORS.NETWORK_CHECKBOX_PREFIX}eip155-${chainId}`;

export const ALL_CHAIN_IDS = [
  MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
  MultichainUtilities.CHAIN_IDS.LINEA_MAINNET,
  MultichainUtilities.CHAIN_IDS.ARBITRUM_ONE,
  MultichainUtilities.CHAIN_IDS.AVALANCHE,
  MultichainUtilities.CHAIN_IDS.OPTIMISM,
  MultichainUtilities.CHAIN_IDS.POLYGON,
  MultichainUtilities.CHAIN_IDS.ZKSYNC_ERA,
  MultichainUtilities.CHAIN_IDS.BASE,
  MultichainUtilities.CHAIN_IDS.BSC,
  MultichainUtilities.CHAIN_IDS.LOCALHOST,
];

export async function clearSessionResult(resultIndex = 0): Promise<void> {
  const elementId = `${SELECTORS.SESSION_METHOD_RESULT}${resultIndex}`;
  await ChromeCdpHelpers.evaluateInWebView(
    MULTICHAIN_TEST_DAPP_BASE_URL,
    `(() => { const el = document.getElementById(${JSON.stringify(elementId)}); if (el) el.textContent = ''; })()`,
  ).catch(() => undefined);
}

/**
 * Applies the requested network selection, then re-reads every checkbox and
 * re-applies if the dapp reset the selection mid-loop (it does that whenever
 * a `wallet_getSession` response lands).
 */
export async function applyNetworkSelection(chainIds: string[]): Promise<void> {
  const requested = chainIds.join(', ') || 'none';

  for (let attempt = 1; attempt <= SELECTION_ATTEMPTS; attempt++) {
    for (const chainId of ALL_CHAIN_IDS) {
      await setCheckboxState(chainId, chainIds.includes(chainId));
    }

    const states = await readAllCheckboxStates();
    const wrong = ALL_CHAIN_IDS.filter(
      (chainId) =>
        states[chainId] !==
        (chainIds.includes(chainId) ? 'checked' : 'unchecked'),
    );

    if (wrong.length === 0) {
      logger.debug(
        `network selection [${requested}] applied on attempt ${attempt}`,
      );
      return;
    }

    logger.warn(
      `attempt ${attempt}/${SELECTION_ATTEMPTS}: chains [${wrong.join(
        ', ',
      )}] do not match request [${requested}]; observed: ${JSON.stringify(states)}`,
    );
  }

  throw new Error(
    `applyNetworkSelection: selection [${requested}] did not stick after ${SELECTION_ATTEMPTS} attempts. Observed: ${JSON.stringify(
      await readAllCheckboxStates(),
    )}`,
  );
}

/**
 * Clicks a network checkbox until it actually reports the desired state.
 * Clicks land on a disabled input as no-ops, so wait for it to be enabled
 * before clicking and confirm the state afterwards.
 */
export async function setCheckboxState(
  chainId: string,
  checked: boolean,
): Promise<boolean> {
  const webId = checkboxIdFor(chainId);
  const desired: CheckboxState = checked ? 'checked' : 'unchecked';
  const deadline = Date.now() + CHECKBOX_SETTLE_TIMEOUT_MS;
  let state: CheckboxState = 'missing';
  let clicks = 0;

  while (Date.now() < deadline) {
    state = await readCheckboxState(webId);
    if (state === desired) return true;

    if (state === 'missing' || state.endsWith('-disabled')) {
      await wait(POLL_INTERVAL_MS);
      continue;
    }

    await ChromeCdpHelpers.clickByIdInWebView(
      MULTICHAIN_TEST_DAPP_BASE_URL,
      webId,
    );
    clicks += 1;
    await wait(POLL_INTERVAL_MS);
  }

  logger.warn(
    `#${webId} stuck at "${state}" (wanted "${desired}") after ${clicks} click(s)`,
  );
  return false;
}

export async function readConnectionState(): Promise<ConnectionState> {
  const state = await ChromeCdpHelpers.evaluateInWebView<string>(
    MULTICHAIN_TEST_DAPP_BASE_URL,
    `(() => {
        const el = document.getElementById(${JSON.stringify(SELECTORS.CREATE_SESSION_BUTTON)});
        if (!el) return 'missing';
        return el.disabled ? 'disabled' : 'enabled';
      })()`,
  );
  if (state === 'enabled' || state === 'disabled' || state === 'missing') {
    return state;
  }
  return 'unreadable';
}

export async function readCheckboxState(webId: string): Promise<CheckboxState> {
  const states = await readCheckboxStates([webId]);
  return states[webId] ?? 'missing';
}

export async function readAllCheckboxStates(): Promise<
  Record<string, CheckboxState>
> {
  const states = await readCheckboxStates(ALL_CHAIN_IDS.map(checkboxIdFor));
  const byChainId: Record<string, CheckboxState> = {};
  for (const chainId of ALL_CHAIN_IDS) {
    byChainId[chainId] = states[checkboxIdFor(chainId)] ?? 'missing';
  }
  return byChainId;
}

async function readCheckboxStates(
  webIds: string[],
): Promise<Record<string, CheckboxState>> {
  const raw = await ChromeCdpHelpers.evaluateInWebView<string>(
    MULTICHAIN_TEST_DAPP_BASE_URL,
    `(() => {
        const states = {};
        for (const id of ${JSON.stringify(webIds)}) {
          const el = document.getElementById(id);
          if (!(el instanceof HTMLInputElement)) {
            states[id] = 'missing';
            continue;
          }
          states[id] =
            (el.checked ? 'checked' : 'unchecked') +
            (el.disabled ? '-disabled' : '');
        }
        return JSON.stringify(states);
      })()`,
  );

  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, CheckboxState>;
  } catch {
    logger.warn(`could not parse checkbox states: ${raw}`);
    return {};
  }
}
