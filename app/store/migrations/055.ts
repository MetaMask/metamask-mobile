import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export const version = 55;

/**
 * Adds built-in Infura network configurations.
 *
 * @param networkConfigurations - Existing network configurations.
 * @returns Updated network configurations including Infura networks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addBuiltInInfuraNetworks(networkConfigurations: any[]) {
  return [
    {
      type: 'infura',
      id: 'mainnet',
      chainId: '0x1',
      ticker: 'ETH',
      nickname: 'Ethereum Mainnet',
      rpcUrl: 'https://mainnet.infura.io/v3/{infuraProjectId}',
      rpcPrefs: { blockExplorerUrl: 'https://etherscan.io' },
    },
    {
      type: 'infura',
      id: 'sepolia',
      chainId: '0xaa36a7',
      ticker: 'SepoliaETH',
      nickname: 'Sepolia',
      rpcUrl: 'https://sepolia.infura.io/v3/{infuraProjectId}',
      rpcPrefs: { blockExplorerUrl: 'https://sepolia.etherscan.io' },
    },
    {
      type: 'infura',
      id: 'linea-sepolia',
      chainId: '0xe705',
      ticker: 'LineaETH',
      nickname: 'Linea Sepolia',
      rpcUrl: 'https://linea-sepolia.infura.io/v3/{infuraProjectId}',
      rpcPrefs: { blockExplorerUrl: 'https://sepolia.lineascan.build' },
    },
    {
      type: 'infura',
      id: 'linea-mainnet',
      chainId: '0xe708',
      ticker: 'ETH',
      nickname: 'Linea Mainnet',
      rpcUrl: 'https://linea-mainnet.infura.io/v3/{infuraProjectId}',
      rpcPrefs: { blockExplorerUrl: 'https://lineascan.build' },
    },
    ...networkConfigurations,
  ];
}

// Matches network controller validation
function isValidUrl(url: string) {
  const uri = parse(url);
  return (
    uri.error === undefined && (uri.scheme === 'http' || uri.scheme === 'https')
  );
}

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 55)) {
    return state;
  }

  const tokensControllerState = state.engine.backgroundState.TokensController;
  if (!isObject(tokensControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 54: Invalid TokensController state error: '${typeof tokensControllerState}'`,
      ),
    );
    return state;
  }

  if (Array.isArray(tokensControllerState.tokens)) {
    const migratedTokens = tokensControllerState.tokens.map((token) => {
      if (!hasProperty(token, 'balanceError')) {
        return token;
      }
      if (token?.balanceError === null || token?.balanceError === undefined) {
        token.hasBalanceError = false;
      } else {
        token.hasBalanceError = true;
      }
      delete token?.balanceError;
      return token;
    });
    tokensControllerState.tokens = migratedTokens;
  }

  // Return the modified state
  return state;
}
