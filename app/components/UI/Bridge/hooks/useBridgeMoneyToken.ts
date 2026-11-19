import { useMemo } from 'react';
import { parseCaipAssetType } from '@metamask/utils';

import { TokenSelectorType, type BridgeToken } from '../types';
import useMoneyAccountDepositAssetId from '../../Money/hooks/useMoneyAccountDepositAssetId';
import useMoneyVaultApy from '../../Money/hooks/useMoneyVaultApy';
import { useBridgeMoneyAccountBalance } from './useBridgeMoneyAccountBalance';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectBridgeMoneyEnabled } from '../../../../selectors/bridge/featureFlags';
import { selectIsMoneyAccountVisible } from '../../Money/selectors/visibility';
import { useSwapsFeatureId } from './useSwapsFeatureId';
import { FeatureId } from '@metamask/bridge-controller';

/**
 * Checks if the money account should be visible, and if the swapsMoneyConfig feature flag is enabled.
 * Builds a BridgeToken object representing the user's money account info.
 *
 * @param {Object} param0 - The parameters for the money token
 * @param {TokenSelectorType} param0.type - source or destination token selector type
 * @returns
 */
export const useMoneyToken = ({ type }: { type: TokenSelectorType }) => {
  const { apyPercent } = useMoneyVaultApy();
  const moneyAccountBalance = useBridgeMoneyAccountBalance();

  // Read vault config to get the money asset id
  const moneyAssetId = useMoneyAccountDepositAssetId();
  const { assetReference, chainId } = parseCaipAssetType(moneyAssetId);

  const moneySwapEnabled = useSelector(selectBridgeMoneyEnabled);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);

  const featureId = useSwapsFeatureId();

  return useMemo((): BridgeToken | undefined => {
    if (
      !moneySwapEnabled ||
      !isMoneyAccountVisible ||
      featureId !== FeatureId.UNIFIED_SWAP_BRIDGE
    ) {
      return undefined;
    }

    const baseToken = {
      address: assetReference,
      symbol: 'MUSD',
      name: strings('money.splash.eyebrow'),
      decimals: 6,
      chainId,
      isMoneyToken: true,
      apy: apyPercent,
    };

    return {
      ...baseToken,
      balance:
        type === TokenSelectorType.Source
          ? moneyAccountBalance.withdrawableMusd?.toFixed()
          : moneyAccountBalance.tokenTotal?.toString(),
      balanceFiat:
        type === TokenSelectorType.Source
          ? moneyAccountBalance.withdrawableFiatFormatted
          : moneyAccountBalance.totalFiatFormatted,
    };
  }, [
    apyPercent,
    moneyAccountBalance,
    moneySwapEnabled,
    isMoneyAccountVisible,
    type,
    assetReference,
    chainId,
    featureId,
  ]);
};
