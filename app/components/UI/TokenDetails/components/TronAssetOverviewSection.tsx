import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import type { CaipChainId } from '@metamask/utils';
import type { TokenI } from '../../Tokens/types';
import Balance from '../../AssetOverview/Balance';
import TronUnstakingBanner from '../../Earn/components/Tron/TronUnstakingBanner/TronUnstakingBanner';
import TronUnstakedBanner from '../../Earn/components/Tron/TronUnstakedBanner/TronUnstakedBanner';
import TronStakingButtons from '../../Earn/components/Tron/TronStakingButtons/TronStakingButtons';
import TronStakingCta from '../../Earn/components/Tron/TronStakingCta/TronStakingCta';
import TronClaimableRewardsRow from '../../Earn/components/Tron/TronStakingRewardsRows/TronClaimableRewardsRow';
import TronEstimatedAnnualRewardsRow from '../../Earn/components/Tron/TronStakingRewardsRows/TronEstimatedAnnualRewardsRow';
import TronErrorsBanner from '../../Earn/components/Tron/TronStakingRewardsRows/TronErrorsBanner';
import useTronAssetOverviewSection from './useTronAssetOverviewSection';
import type { TronNativeToken } from '../utils/isTronNativeToken';

export interface TronAssetOverviewSectionProps {
  token: TronNativeToken;
  stakedTrxAsset?: TokenI;
  inLockPeriodBalance?: string;
  readyForWithdrawalBalance?: string;
}

const TronAssetOverviewSection = ({
  token,
  stakedTrxAsset,
  inLockPeriodBalance,
  readyForWithdrawalBalance,
}: TronAssetOverviewSectionProps) => {
  const {
    aprText,
    claimableRewardsRowProps,
    estimatedAnnualRewardsRowProps,
    errorMessages,
  } = useTronAssetOverviewSection({
    enabled: true,
    tokenAddress: token.address,
    tokenChainId: token.chainId,
  });

  return (
    <>
      {stakedTrxAsset ? (
        <Balance
          asset={stakedTrxAsset}
          mainBalance={stakedTrxAsset.balance ?? ''}
          secondaryBalance={`${stakedTrxAsset.balance} ${stakedTrxAsset.symbol}`}
          hideTitleHeading
          hidePercentageChange
        />
      ) : null}
      {errorMessages.length > 0 ? (
        <Box paddingTop={2} paddingHorizontal={4}>
          <TronErrorsBanner messages={errorMessages} />
        </Box>
      ) : null}
      {claimableRewardsRowProps || estimatedAnnualRewardsRowProps ? (
        <Box paddingHorizontal={4}>
          {claimableRewardsRowProps ? (
            <TronClaimableRewardsRow {...claimableRewardsRowProps} />
          ) : null}
          {estimatedAnnualRewardsRowProps ? (
            <TronEstimatedAnnualRewardsRow
              {...estimatedAnnualRewardsRowProps}
            />
          ) : null}
        </Box>
      ) : null}
      {readyForWithdrawalBalance ? (
        <Box paddingTop={3} paddingHorizontal={4}>
          <TronUnstakedBanner
            amount={readyForWithdrawalBalance}
            chainId={String(token.chainId) as CaipChainId}
          />
        </Box>
      ) : null}
      {inLockPeriodBalance ? (
        <Box paddingTop={3} paddingHorizontal={4}>
          <TronUnstakingBanner amount={inLockPeriodBalance} />
        </Box>
      ) : null}
      {stakedTrxAsset ? (
        <Box paddingTop={4} paddingHorizontal={4}>
          <TronStakingButtons asset={stakedTrxAsset} />
        </Box>
      ) : (
        <Box paddingTop={3} paddingHorizontal={4}>
          <TronStakingCta asset={token} aprText={aprText} />
        </Box>
      )}
    </>
  );
};

export default TronAssetOverviewSection;
