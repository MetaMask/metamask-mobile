import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 161: clean invalid fields from `NetworkController` network configurations.
 *
 * - `wallet_addEthereumChain` without `blockExplorerUrls` stored `null` as a block explorer.
 * - The network manager stored the derived `caipChainId` through `updateNetwork`.
 *
 * Non-string block explorer entries are removed, `defaultBlockExplorerUrlIndex` keeps
 * pointing at the same explorer (or is removed when none remain), and `caipChainId` is deleted.
 */
export const migrationVersion = 161;

const isValidExplorer = (url: unknown): url is string =>
  typeof url === 'string' && url.length > 0;

function cleanBlockExplorers(config: Record<string, unknown>) {
  const { blockExplorerUrls, defaultBlockExplorerUrlIndex } = config;
  if (!Array.isArray(blockExplorerUrls)) {
    return;
  }

  const validUrls = blockExplorerUrls.filter(isValidExplorer);
  if (validUrls.length === blockExplorerUrls.length) {
    return;
  }

  config.blockExplorerUrls = validUrls;

  if (validUrls.length === 0) {
    delete config.defaultBlockExplorerUrlIndex;
    return;
  }

  const defaultUrl =
    typeof defaultBlockExplorerUrlIndex === 'number'
      ? blockExplorerUrls[defaultBlockExplorerUrlIndex]
      : undefined;
  const newIndex = isValidExplorer(defaultUrl)
    ? blockExplorerUrls
        .slice(0, defaultBlockExplorerUrlIndex as number)
        .filter(isValidExplorer).length
    : 0;
  config.defaultBlockExplorerUrlIndex = newIndex;
}

export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const networkController = state.engine.backgroundState.NetworkController;
    if (
      !isObject(networkController) ||
      !isObject(networkController.networkConfigurationsByChainId)
    ) {
      return state;
    }

    for (const config of Object.values(
      networkController.networkConfigurationsByChainId,
    )) {
      if (!isObject(config)) {
        continue;
      }
      cleanBlockExplorers(config);
      if (hasProperty(config, 'caipChainId')) {
        delete config.caipChainId;
      }
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to clean network configurations: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
}
