import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import { earnSelectors } from '../../../../../selectors/earnController';
import StakingBalance from '../../../Stake/components/StakingBalance/StakingBalance';
import { TokenI } from '../../../Tokens/types';
import EarnLendingBalance from '../EarnLendingBalance';
import { selectIsStakeableToken } from '../../../Stake/selectors/stakeableTokens';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import TronStakingButtons from '../Tron/TronStakingButtons';
import { selectTronResourcesBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { selectTrxStakingEnabled } from '../../../../../selectors/featureFlagController/trxStakingEnabled';
import { hasStakedTrxPositions as hasStakedTrxPositionsUtil } from '../../utils/tron';
import useTronStakeApy from '../../hooks/useTronStakeApy';
///: END:ONLY_INCLUDE_IF
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { useMusdConversionEligibility } from '../../hooks/useMusdConversionEligibility';
import { selectIsMusdConversionFlowEnabledFlag } from '../../selectors/featureFlags';
export interface EarnBalanceProps {
  asset: TokenI;
}

// Single entry-point for all Earn asset balances
const EarnBalance = ({ asset }: EarnBalanceProps) => {
  const isLendingToken = useSelector((state: RootState) =>
    earnSelectors.selectEarnToken(state, asset),
  );
  const isReceiptToken = useSelector((state: RootState) =>
    earnSelectors.selectEarnOutputToken(state, asset),
  );
  const isStakeableToken = useSelector((state: RootState) =>
    selectIsStakeableToken(state, asset),
  );

  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );

  const { isConversionToken } = useMusdConversionTokens();
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);

  const isTron = asset?.chainId?.startsWith('tron:');
  const isStakedTrxAsset =
    isTron && (asset?.ticker === 'sTRX' || asset?.symbol === 'sTRX');

  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);
  const hasStakedTrxPositions = React.useMemo(
    () => hasStakedTrxPositionsUtil(tronResources),
    [tronResources],
  );

  const { apyPercent: tronApyPercent } = useTronStakeApy();

  if (isTron && isTrxStakingEnabled) {
    if (hasStakedTrxPositions && isStakedTrxAsset) {
      // sTRX row: show Unstake + Stake more
      return (
        <TronStakingButtons asset={asset} showUnstake hasStakedPositions />
      );
    }

    if (!hasStakedTrxPositions && !isStakedTrxAsset) {
      // TRX native row: show CTA + single Stake button
      return (
        <TronStakingButtons
          asset={asset}
          aprText={tronApyPercent ?? undefined}
        />
      );
    }

    return null;
  }
  ///: END:ONLY_INCLUDE_IF

  const isConvertibleStablecoin =
    isMusdConversionFlowEnabled && isConversionToken(asset) && isGeoEligible;

  // EVM staking: only when stakeable and not a staked output token
  if (isStakeableToken && !asset.isStaked) {
    return <StakingBalance asset={asset} />;
  }

  if (!asset.chainId) return null;

  if (isLendingToken || isReceiptToken || isConvertibleStablecoin) {
    return <EarnLendingBalance asset={asset} />;
  }

  return null;
};

export default EarnBalance;
