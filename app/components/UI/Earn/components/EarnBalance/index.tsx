import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { RootState } from '../../../../../reducers';
import { earnSelectors } from '../../../../../selectors/earnController';
import StakingOverview from '../../../Stake/components/StakingBalance/StakingOverview';
import StakingDiscovery from '../../../Stake/components/StakingBalance/StakingDiscovery/StakingDiscovery';
import { TokenI } from '../../../Tokens/types';
import EarnLendingBalance from '../EarnLendingBalance';
import { selectIsStakeableToken } from '../../../Stake/selectors/stakeableTokens';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { selectTrxStakingEnabled } from '../../../../../selectors/featureFlagController/trxStakingEnabled';
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

  if (isTron && isTrxStakingEnabled) {
    return null;
  }
  ///: END:ONLY_INCLUDE_IF

  const isConvertibleStablecoin =
    isMusdConversionFlowEnabled && isConversionToken(asset) && isGeoEligible;

  // EVM staking: native ETH shows discovery, staked ETH shows active staking UI
  if (isStakeableToken) {
    return (
      <Box twClassName="px-4">
        {asset.isStaked ? (
          <StakingOverview asset={asset} />
        ) : (
          <StakingDiscovery asset={asset} />
        )}
      </Box>
    );
  }

  if (!asset.chainId) return null;

  if (isLendingToken || isReceiptToken || isConvertibleStablecoin) {
    return <EarnLendingBalance asset={asset} />;
  }

  return null;
};

export default EarnBalance;
