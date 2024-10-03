import { captureException } from '@sentry/react-native';
import {
  TransactionControllerState,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { parse, equal } from 'uri-js';
import { SelectedNetworkControllerState } from '@metamask/selected-network-controller';
import { hasProperty, isObject, RuntimeObject } from '@metamask/utils';
import { ensureValidState } from './util';

export const version = 54;

/**
 * Adds built-in Infura network configurations.
 *
 * @param networkConfigurations - Existing network configurations.
 * @returns Updated network configurations including Infura networks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addBuiltInInfuraNetworks(networkConfigurations: any[]) {
  console.log('Adding built-in Infura networks...');
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
  console.log('Starting migration for version:', version);

  if (!ensureValidState(state, 54)) {
    console.log('State is not valid for migration, returning original state.');
    return state;
  }

  console.log('Valid state for migration found.');

  const networkControllerState =
    state.engine?.backgroundState?.NetworkController;
  const transactionControllerState = state.engine?.backgroundState
    ?.TransactionController as TransactionControllerState;
  const selectedNetworkController = state.engine?.backgroundState
    ?.SelectedNetworkController as SelectedNetworkControllerState;

  if (!isObject(networkControllerState)) {
    console.log('Invalid NetworkController state:', networkControllerState);
    captureException(
      new Error(
        `FATAL ERROR: Migration ${version}: Invalid NetworkController state error: '${typeof networkControllerState}'`,
      ),
    );
    return state;
  }

  if (!isObject(transactionControllerState)) {
    console.log(
      'Invalid TransactionController state:',
      transactionControllerState,
    );
    captureException(
      new Error(
        `FATAL ERROR: Migration ${version}: Invalid TransactionController state error: '${typeof transactionControllerState}'`,
      ),
    );
    return state;
  }

  const networkState = networkControllerState;

  // Get custom network configurations or default to an empty array
  let networkConfigurations = isObject(networkState.networkConfigurations)
    ? Object.values(networkState.networkConfigurations)
    : [];

  console.log('Existing network configurations:', networkConfigurations);

  // Add built-in Infura networks
  networkConfigurations = addBuiltInInfuraNetworks(networkConfigurations);

  console.log(
    'Network configurations after adding Infura networks:',
    networkConfigurations,
  );

  // Group the network configurations by chain id
  const networkConfigurationArraysByChainId = networkConfigurations.reduce(
    (acc: Record<string, RuntimeObject[]>, networkConfiguration) => {
      if (
        isObject(networkConfiguration) &&
        typeof networkConfiguration.chainId === 'string'
      ) {
        (acc[networkConfiguration.chainId] ??= []).push(networkConfiguration);
      }
      return acc;
    },
    {},
  );

  console.log(
    'Grouped network configurations by chain id:',
    networkConfigurationArraysByChainId,
  );

  // Get transaction history in reverse chronological order to help with tie breaks
  const transactions: RuntimeObject[] = Array.isArray(
    transactionControllerState.transactions,
  )
    ? transactionControllerState.transactions
        .filter(
          (tx: TransactionMeta) =>
            isObject(tx) &&
            typeof tx.time === 'number' &&
            typeof tx.networkClientId === 'string',
        )
        .sort((a, b) => b.time - a.time)
    : [];

  console.log('Sorted transaction history:', transactions);

  // For each chain id, merge the array of network configurations
  const networkConfigurationsByChainId = Object.entries(
    networkConfigurationArraysByChainId,
  ).reduce((acc: Record<string, unknown>, [chainId, networks]) => {
    console.log(`Processing network configurations for chainId: ${chainId}`);

    // Calculate the tie breaker network, whose values will be preferred
    let tieBreaker: RuntimeObject | undefined;

    // If one of the networks is the globally selected network, use that
    tieBreaker = networks.find(
      (network) => network.id === networkState.selectedNetworkClientId,
    );

    // Otherwise use the network that was most recently transacted on
    if (!tieBreaker) {
      transactions
        .filter((tx) => tx.chainId === chainId)
        .some(
          (tx) =>
            (tieBreaker = networks.find(
              (network) => network.id === tx.networkClientId,
            )),
        );
    }

    // If no transactions were found for the chain id, fall back
    // to an arbitrary custom network that is not built in Infura
    if (!tieBreaker) {
      tieBreaker = networks.find((network) => network.type !== 'infura');
    }

    console.log('Tie breaker network for chainId', chainId, tieBreaker);

    // Calculate the unique set of valid rpc endpoints for this chain id
    const rpcEndpoints = networks.reduce(
      (endpoints: RuntimeObject[], network) => {
        if (
          network.id &&
          network.rpcUrl &&
          typeof network.rpcUrl === 'string' &&
          isValidUrl(network.rpcUrl)
        ) {
          // Check if there's a different duplicate that's also the selected network
          const duplicateAndSelected = networkConfigurations.some(
            (otherNetwork) =>
              isObject(otherNetwork) &&
              typeof otherNetwork.rpcUrl === 'string' &&
              typeof network.rpcUrl === 'string' &&
              otherNetwork.id !== network.id && // A different endpoint
              equal(otherNetwork.rpcUrl, network.rpcUrl) && // With the same URL
              otherNetwork.id === networkState.selectedNetworkClientId, // That's currently selected
          );

          // Check if there's a duplicate that we've already processed
          const duplicateAlreadyAdded = [
            // Chains we've already processed
            ...Object.values(acc).flatMap((n) =>
              isObject(n) ? n.rpcEndpoints : [],
            ),
            // Or the current chain we're processing
            ...endpoints,
          ].some(
            (existingEndpoint) =>
              isObject(existingEndpoint) &&
              typeof existingEndpoint.url === 'string' &&
              typeof network.rpcUrl === 'string' &&
              equal(existingEndpoint.url, network.rpcUrl),
          );

          if (!duplicateAndSelected && !duplicateAlreadyAdded) {
            // The endpoint is unique and valid, so add it to the list
            endpoints.push({
              networkClientId: network.id,
              url: network.rpcUrl,
              type: network.type === 'infura' ? 'infura' : 'custom',
              ...(network.type !== 'infura' &&
                typeof network.nickname === 'string' &&
                network.nickname && { name: network.nickname }),
            });
          }
        }
        return endpoints;
      },
      [],
    );

    console.log(`RPC endpoints for chainId ${chainId}:`, rpcEndpoints);

    // If there were no valid unique endpoints, omit the network configuration
    if (rpcEndpoints.length === 0) {
      return acc;
    }

    // Use the tie breaker network as the default rpc endpoint
    const defaultRpcEndpointIndex = Math.max(
      rpcEndpoints.findIndex(
        (endpoint) => endpoint.networkClientId === tieBreaker?.id,
      ),
      // Or arbitrarily default to the first endpoint if we don't have a tie breaker
      0,
    );

    // Calculate the unique array of non-empty block explorer urls
    const blockExplorerUrls = [
      ...networks.reduce((urls, network) => {
        if (
          isObject(network.rpcPrefs) &&
          typeof network.rpcPrefs.blockExplorerUrl === 'string' &&
          network.rpcPrefs.blockExplorerUrl
        ) {
          urls.add(network.rpcPrefs.blockExplorerUrl);
        }
        return urls;
      }, new Set()),
    ];

    console.log(
      `Block explorer URLs for chainId ${chainId}:`,
      blockExplorerUrls,
    );

    // Use the tie breaker network as the default block explorer, if it has one
    const defaultBlockExplorerUrlIndex =
      blockExplorerUrls.length === 0
        ? undefined
        : Math.max(
            blockExplorerUrls.findIndex(
              (url) =>
                isObject(tieBreaker?.rpcPrefs) &&
                url === tieBreaker.rpcPrefs.blockExplorerUrl,
            ),
            // Or arbitrarily default to the first url
            0,
          );

    const name = networks.find((n) => n.nickname)?.nickname;
    const nativeCurrency =
      tieBreaker?.ticker ?? networks.find((n) => n.ticker)?.ticker;

    acc[chainId] = {
      chainId,
      rpcEndpoints,
      defaultRpcEndpointIndex,
      blockExplorerUrls,
      ...(defaultBlockExplorerUrlIndex !== undefined && {
        defaultBlockExplorerUrlIndex,
      }),
      name,
      nativeCurrency,
    };

    console.log(
      `Final network configuration for chainId ${chainId}:`,
      acc[chainId],
    );

    return acc;
  }, {});

  console.log(
    'Final network configurations by chainId:',
    networkConfigurationsByChainId,
  );

  // Continue migration logic for remaining parts

  // Return the modified state
  return state;
}
