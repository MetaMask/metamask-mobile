import { rpcErrors, providerErrors } from '@metamask/rpc-errors';
import { CaipChainId, KnownCaipNamespace } from '@metamask/utils';
import type { SessionTypes } from '@walletconnect/types';
import type { ImageSourcePropType } from 'react-native';

import { selectEvmNetworkConfigurationsByChainId } from '../../selectors/networkController';
import { store } from '../../store';
import AppConstants from '../AppConstants';
import Engine from '../Engine';
import { switchToNetwork } from '../RPCMethods/lib/ethereum-chain-utils';
import { getRpcMethodMiddlewareHooks } from '../RPCMethods/RPCMethodMiddleware';
import DevLogger from '../SDKConnect/utils/DevLogger';

import {
  getChainIdForCaipChainId,
  hasPermissionsToSwitchChainRequest,
} from './wc-utils';

/**
 * True if the given CAIP-2 chain id corresponds to an EVM network the wallet
 * has configured. Non-existent chains short-circuit with `false` to let
 * callers return a structured error to the dapp.
 */
export const doesChainExist = (caip2ChainId: CaipChainId): boolean => {
  try {
    const chainId = getChainIdForCaipChainId(caip2ChainId);
    const networkConfigurations = selectEvmNetworkConfigurationsByChainId(
      store.getState(),
    );
    return networkConfigurations[chainId] !== undefined;
  } catch {
    return false;
  }
};

/**
 * Switch the wallet to the EVM chain identified by `caip2ChainId`, first
 * requesting user consent via the approval UI when the chain isn't already
 * permitted. Throws an rpc-errors-shaped error the caller can forward back
 * to the dapp.
 */
export const switchToChain = async ({
  caip2ChainId,
  session,
  channelId,
  selfReportedUrl,
  currentChainIdHex,
  originFromRequest,
  allowSwitchingToNewChain = false,
}: {
  caip2ChainId: CaipChainId;
  session: SessionTypes.Struct;
  channelId: string;
  /** WARNING: self-reported by the dapp and unverified. */
  selfReportedUrl: string;
  /** Active wallet EVM chain id, hex-encoded. */
  currentChainIdHex: string;
  /** WARNING: self-reported by the dapp and unverified. */
  originFromRequest?: string;
  allowSwitchingToNewChain?: boolean;
}): Promise<void> => {
  if (!doesChainExist(caip2ChainId)) {
    throw rpcErrors.invalidParams({
      message: `Invalid parameters: chainId does not exist.`,
    });
  }

  // NOTE: originFromRequest and selfReportedUrl are both unverified
  // dapp-provided values. They are shown in the confirmation/approval UI to
  // indicate the claimed source of the request. They MUST NOT be treated as
  // equivalent to a verified origin/hostname.
  const unverifiedOrigin = originFromRequest ?? selfReportedUrl;

  const { allowed, existingNetwork, hexChainIdString } =
    await hasPermissionsToSwitchChainRequest(caip2ChainId, channelId);

  if (!allowed && !allowSwitchingToNewChain) {
    throw rpcErrors.invalidParams({
      message: `Invalid parameters: active chainId is different than the one provided.`,
    });
  }

  const activeCaip2ChainId = `${KnownCaipNamespace.Eip155}:${parseInt(
    currentChainIdHex,
    16,
  )}`;

  if (caip2ChainId === activeCaip2ChainId) {
    return;
  }

  DevLogger.log(`WC::switchToChain switching to network:`, existingNetwork);
  const [networkClientId, networkConfiguration] = existingNetwork;

  const buildHooks = () => {
    const hooks = getRpcMethodMiddlewareHooks({
      origin: channelId,
      url: { current: unverifiedOrigin },
      title: { current: session.peer.metadata.name },
      icon: {
        current: session.peer.metadata.icons?.[0] as ImageSourcePropType,
      },
      analytics: {},
      channelId,
      getSource: () => AppConstants.REQUEST_SOURCES.WC,
    });

    const original = hooks.requestPermittedChainsPermissionIncrementalForOrigin;
    hooks.requestPermittedChainsPermissionIncrementalForOrigin = (...args) => {
      // Clear any pending approvals before prompting the user to permit a new
      // chain. Legacy behavior carried over from the original implementation;
      // see https://github.com/MetaMask/metamask-mobile/blob/081e412f6680e03ad509194acd620c67a273a92b/app/core/WalletConnect/wc-utils.ts#L242
      Engine.context.ApprovalController.clearRequests(
        providerErrors.userRejectedRequest(),
      );
      return original(...args);
    };
    return hooks;
  };

  const rpcUrl =
    networkConfiguration.rpcEndpoints[
      networkConfiguration.defaultRpcEndpointIndex
    ].url;

  await switchToNetwork({
    networkClientId,
    nativeCurrency: networkConfiguration.nativeCurrency,
    chainId: hexChainIdString,
    rpcUrl,
    analytics: {},
    origin: channelId,
    hooks: buildHooks(),
  });
};
