import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { RootState } from '../../../../../reducers';
import { earnSelectors } from '../../../../../selectors/earnController';
import StakingBalance from '../../../Stake/components/StakingBalance/StakingBalance';
import { TokenI } from '../../../Tokens/types';
import EarnLendingBalance from '../EarnLendingBalance';
import EarnMaintenanceBanner from '../EarnMaintenanceBanner';
import { selectIsStakeableToken } from '../../../Stake/selectors/stakeableTokens';
import { selectTrxStakingEnabled } from '../../../../../selectors/featureFlagController/trxStakingEnabled';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { useMusdConversionEligibility } from '../../hooks/useMusdConversionEligibility';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
} from '../../selectors/featureFlags';
import { EARN_EXPERIENCES } from '../../constants/experiences';
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
  const isPooledStakingServiceInterruptionBannerEnabled = useSelector(
    selectPooledStakingServiceInterruptionBannerEnabledFlag,
  );
  const isStakeableToken = useSelector((state: RootState) =>
    selectIsStakeableToken(state, asset),
  );

  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );

  const { isConversionToken } = useMusdConversionTokens();
  const { isEligible: isGeoEligible } = useMusdConversionEligibility();

  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);
  const isTron = asset?.chainId?.startsWith('tron:');

  if (isTron && isTrxStakingEnabled) {
    return null;
  }

  const isConvertibleStablecoin =
    isMusdConversionFlowEnabled && isConversionToken(asset) && isGeoEligible;
  const isPooledStakingOutput =
    asset.isStaked &&
    isReceiptToken?.experience?.type === EARN_EXPERIENCES.POOLED_STAKING;

  // EVM staking: only when stakeable and not a staked output token
  if (isStakeableToken && !asset.isStaked) {
    return (
      <Box twClassName="px-4">
        <StakingBalance asset={asset} />
      </Box>
    );
  }

  if (!asset.chainId) return null;

  if (isPooledStakingOutput) {
    return (
      <>
        {isPooledStakingServiceInterruptionBannerEnabled && (
          <Box twClassName="px-4 pt-4">
            <EarnMaintenanceBanner
              experienceName={EARN_EXPERIENCES.POOLED_STAKING}
            />
          </Box>
        )}
        <EarnLendingBalance asset={asset} />
      </>
    );
  }

  if (isLendingToken || isReceiptToken || isConvertibleStablecoin) {
    return <EarnLendingBalance asset={asset} />;
  }

  return null;
};

export default EarnBalance;
