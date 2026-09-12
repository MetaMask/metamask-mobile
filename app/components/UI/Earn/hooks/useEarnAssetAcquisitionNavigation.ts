import { useCallback } from 'react';
import { useStore } from 'react-redux';
import type { CaipChainId, Hex } from '@metamask/utils';
import type { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { selectIsBridgeEnabledSourceFactory } from '../../../../core/redux/slices/bridge';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { areAddressesEqual } from '../../../../util/address';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../Bridge/hooks/useSwapBridgeNavigation';
import type { BridgeToken } from '../../Bridge/types';
import { computeBuySourceToken } from '../../Bridge/utils/computeBuySourceToken';
import { RAMPS_BUY_CUF_SURFACE } from '../../Ramp/constants/rampsBuyCufTags';
import { useRampNavigation } from '../../Ramp/hooks/useRampNavigation';
import { EARN_MODULE_REDIRECT_TARGETS } from '../constants/earnModuleEvents';
import type {
  EarnAsset,
  EarnAssetId,
  EarnExperience,
} from '../types/earnAssets';
import {
  earnAssetToBridgeToken,
  requiresEarnAssetAcquisition,
} from '../utils/earnAssets';

export type EarnAssetAcquisitionRoute =
  | {
      type: 'swap';
      sourceToken: BridgeToken;
      destinationToken: BridgeToken;
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.SWAP;
    }
  | {
      type: 'buy';
      assetId: EarnAssetId;
      redirectTarget: EARN_MODULE_REDIRECT_TARGETS.BUY;
    };

/**
 * Resolves and executes Swap or Buy navigation for not-ready Earn assets.
 */
const useEarnAssetAcquisitionNavigation = () => {
  const store = useStore<RootState>();
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: Routes.EARN.MODALS.STRATEGY_SELECTION,
    skipActionButtonClickTracking: true,
  });
  const { goToBuy } = useRampNavigation();

  /**
   * Resolves how to acquire an asset required by a not-ready Earn experience.
   *
   * @returns Swap or Buy route, or undefined when acquisition is not required.
   */
  const resolveEarnAssetAcquisitionRoute = useCallback(
    (
      earnAsset: EarnAsset,
      experience: EarnExperience,
    ): EarnAssetAcquisitionRoute | undefined => {
      if (!requiresEarnAssetAcquisition(experience.depositReadiness)) {
        return undefined;
      }

      const destinationToken = earnAssetToBridgeToken(earnAsset);
      const state = store.getState();
      const isBridgeEnabledSource = selectIsBridgeEnabledSourceFactory(state);
      const isDestinationBridgeEnabled = isBridgeEnabledSource(
        destinationToken.chainId,
      );
      // Bridge navigation compares addresses without chain IDs when preserving
      // an explicit destination, so equal-address cross-chain pairs are unsafe.
      const sourceToken = isDestinationBridgeEnabled
        ? computeBuySourceToken(
            selectAssetsBySelectedAccountGroup(state),
            destinationToken.chainId,
            destinationToken.address,
            (asset) =>
              !areAddressesEqual(asset.assetId, destinationToken.address) &&
              isBridgeEnabledSource(asset.chainId as Hex | CaipChainId),
          )
        : null;

      return sourceToken
        ? {
            type: 'swap',
            sourceToken,
            destinationToken,
            redirectTarget: EARN_MODULE_REDIRECT_TARGETS.SWAP,
          }
        : {
            type: 'buy',
            assetId: earnAsset.assetId,
            redirectTarget: EARN_MODULE_REDIRECT_TARGETS.BUY,
          };
    },
    [store],
  );

  /**
   * Navigates to a resolved asset-acquisition route.
   *
   * @param route - Swap or Buy route to execute.
   */
  const navigateToEarnAssetAcquisitionRoute = useCallback(
    async (route: EarnAssetAcquisitionRoute): Promise<void> => {
      if (route.type === 'swap') {
        goToSwaps(route.sourceToken, route.destinationToken, undefined, true);
        return;
      }

      await goToBuy(
        { assetId: route.assetId },
        { surface: RAMPS_BUY_CUF_SURFACE.EARN },
      );
    },
    [goToBuy, goToSwaps],
  );

  return {
    resolveEarnAssetAcquisitionRoute,
    navigateToEarnAssetAcquisitionRoute,
  };
};

export default useEarnAssetAcquisitionNavigation;
