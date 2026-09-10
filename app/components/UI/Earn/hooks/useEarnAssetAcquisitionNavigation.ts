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
  EarnExperienceDepositNotReadyReason,
} from '../types/earnAssets';
import { earnAssetToBridgeToken } from '../utils/earnAssets';

const ACQUISITION_REASONS = new Set<EarnExperienceDepositNotReadyReason>([
  'asset_not_tracked',
  'insufficient_balance',
  'balance_unavailable',
]);

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
 * Determines whether a not-ready Earn experience needs an acquisition flow.
 *
 * @param experience - Selected Earn experience.
 * @returns Whether the user needs to acquire more of the selected asset.
 */
export const isEarnAssetAcquisitionRequired = (
  experience: EarnExperience,
): boolean =>
  experience.depositReadiness.status === 'not_ready' &&
  ACQUISITION_REASONS.has(experience.depositReadiness.reason);

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

  const resolveEarnAssetAcquisitionRoute = useCallback(
    (
      earnAsset: EarnAsset,
      experience: EarnExperience,
    ): EarnAssetAcquisitionRoute | undefined => {
      if (!isEarnAssetAcquisitionRequired(experience)) {
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
