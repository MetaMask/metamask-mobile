import { RpcEndpointType } from '@metamask/network-controller';
import { getErrorMessage, hasProperty, Hex, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { cloneDeep, escapeRegExp } from 'lodash';

const VERSION = 71;

// Chains supported by Infura that are either built in or featured,
// mapped to their corresponding failover URLs.
// Copied from `PopularList` in app/util/networks/customNetworks.ts:
// <https://github.com/MetaMask/metamask-mobile/blob/c29c22bf2ad62171c4cad3b4156500a1347aa7dc/app/util/networks/customNetworks.tsx#L12>
export const INFURA_CHAINS_WITH_FAILOVERS: Map<
  Hex,
  { subdomain: string; getFailoverUrl: () => string | undefined }
> = new Map([
  [
    '0x1',
    {
      subdomain: 'mainnet',
      getFailoverUrl: () => process.env.QUICKNODE_MAINNET_URL,
    },
  ],
  // linea mainnet
  [
    '0xe708',
    {
      subdomain: 'linea-mainnet',
      getFailoverUrl: () => process.env.QUICKNODE_LINEA_MAINNET_URL,
    },
  ],
  [
    '0xa4b1',
    {
      subdomain: 'arbitrum',
      getFailoverUrl: () => process.env.QUICKNODE_ARBITRUM_URL,
    },
  ],
  [
    '0xa86a',
    {
      subdomain: 'avalanche',
      getFailoverUrl: () => process.env.QUICKNODE_AVALANCHE_URL,
    },
  ],
  [
    '0xa',
    {
      subdomain: 'optimism',
      getFailoverUrl: () => process.env.QUICKNODE_OPTIMISM_URL,
    },
  ],
  [
    '0x89',
    {
      subdomain: 'polygon',
      getFailoverUrl: () => process.env.QUICKNODE_POLYGON_URL,
    },
  ],
  [
    '0x2105',
    {
      subdomain: 'base',
      getFailoverUrl: () => process.env.QUICKNODE_BASE_URL,
    },
  ],
]);

export default function migrate(state: unknown) {
  const newState = cloneDeep(state);

  try {
    updateState(newState);
    return newState;
  } catch (error) {
    captureException(
      new Error(`FATAL ERROR: Migration ${VERSION}: ${getErrorMessage(error)}`),
    );
    return state;
  }
}

function updateState(state: unknown) {
  if (!process.env.MM_INFURA_PROJECT_ID) {
    throw new Error('No MM_INFURA_PROJECT_ID set!');
  }

  if (!isObject(state)) {
    throw new Error(`Expected state to be an object, but is ${typeof state}`);
  }

  if (!hasProperty(state, 'engine')) {
    throw new Error('Missing state.engine');
  }

  if (!isObject(state.engine)) {
    throw new Error(
      `Expected state.engine to be an object, but is ${typeof state.engine}`,
    );
  }

  if (!hasProperty(state.engine, 'backgroundState')) {
    throw new Error('Missing state.engine.backgroundState');
  }

  if (!isObject(state.engine.backgroundState)) {
    throw new Error(
      `Expected state.engine.backgroundState to be an object, but is ${typeof state
        .engine.backgroundState}`,
    );
  }

  if (!hasProperty(state.engine.backgroundState, 'NetworkController')) {
    throw new Error('Missing state.engine.backgroundState.NetworkController');
  }

  if (!isObject(state.engine.backgroundState.NetworkController)) {
    throw new Error(
      `Expected state.engine.backgroundState.NetworkController to be an object, but is ${typeof state
        .engine.backgroundState.NetworkController}`,
    );
  }

  if (
    !hasProperty(
      state.engine.backgroundState.NetworkController,
      'networkConfigurationsByChainId',
    )
  ) {
    throw new Error(
      'Missing state.engine.backgroundState.NetworkController.networkConfigurationsByChainId',
    );
  }

  if (
    !isObject(
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
    )
  ) {
    throw new Error(
      `Expected state.engine.backgroundState.NetworkController.networkConfigurationsByChainId to be an object, but is ${typeof state
        .engine.backgroundState.NetworkController
        .networkConfigurationsByChainId}`,
    );
  }

  const { networkConfigurationsByChainId } =
    state.engine.backgroundState.NetworkController;

  for (const [chainId, networkConfiguration] of Object.entries(
    networkConfigurationsByChainId,
  )) {
    const infuraChainWithFailover = INFURA_CHAINS_WITH_FAILOVERS.get(
      chainId as Hex,
    );

    if (
      !isObject(networkConfiguration) ||
      !hasProperty(networkConfiguration, 'rpcEndpoints') ||
      !Array.isArray(networkConfiguration.rpcEndpoints)
    ) {
      continue;
    }

    networkConfiguration.rpcEndpoints = networkConfiguration.rpcEndpoints.map(
      (rpcEndpoint) => {
        if (
          !isObject(rpcEndpoint) ||
          !hasProperty(rpcEndpoint, 'url') ||
          typeof rpcEndpoint.url !== 'string' ||
          hasProperty(rpcEndpoint, 'failoverUrls')
        ) {
          return rpcEndpoint;
        }

        // All featured networks that use Infura get added as custom RPC
        // endpoints, not Infura RPC endpoints
        const match = rpcEndpoint.url.match(
          new RegExp(
            `https://(.+?)\\.infura\\.io/v3/${escapeRegExp(
              process.env.MM_INFURA_PROJECT_ID,
            )}`,
            'u',
          ),
        );
        const isInfuraLike =
          match &&
          infuraChainWithFailover &&
          match[1] === infuraChainWithFailover.subdomain;

        const failoverUrl = infuraChainWithFailover?.getFailoverUrl();

        const failoverUrls =
          failoverUrl &&
          (rpcEndpoint.type === RpcEndpointType.Infura || isInfuraLike)
            ? [failoverUrl]
            : [];
        return {
          ...rpcEndpoint,
          failoverUrls,
        };
      },
    );
  }
}
