import { Hex } from '@metamask/utils';
import bn from 'bignumber.js';
import BN4 from 'bnjs4';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useStyles } from '../../../../../component-library/hooks';
import { getTimeDifferenceFromNow } from '../../../../../util/date';
import { getDecimalChainId } from '../../../../../util/networks';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type { TokenI } from '../../../Tokens/types';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import usePooledStakes from '../../hooks/usePooledStakes';
import { useStakingChainByChainId } from '../../hooks/useStakingChain';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import { multiplyValueByPowerOfTen } from '../../utils/bignumber';
import { fixDisplayAmount } from '../../utils/value';
import styleSheet from './StakingOverview.styles';
import ClaimBanner from './StakingBanners/ClaimBanner/ClaimBanner';
import UnstakingBanner from './StakingBanners/UnstakeBanner/UnstakeBanner';
import StakingButtons from './StakingButtons/StakingButtons';
import { filterExitRequests } from './utils';
import StakingEarnings from '../StakingEarnings';
import { useTheme } from '../../../../../util/theme';

export interface StakingOverviewProps {
  asset: TokenI;
}

const StakingOverviewContent = ({ asset }: StakingOverviewProps) => {
  const theme = useTheme();

  const [
    hasSentViewingStakingRewardsMetric,
    setHasSentViewingStakingRewardsMetric,
  ] = useState(false);

  const { styles } = useStyles(styleSheet, { theme });

  const { isStakingSupportedChain } = useStakingChainByChainId(
    asset.chainId as Hex,
  );

  const { trackEvent, createEventBuilder } = useAnalytics();

  const decimalChainId = getDecimalChainId(asset.chainId);
  const {
    pooledStakesData,
    exchangeRate,
    hasStakedPositions,
    hasEthToUnstake,
    isLoadingPooledStakesData,
  } = usePooledStakes(decimalChainId);

  const { unstakingRequests, claimableRequests } = useMemo(() => {
    const exitRequests = pooledStakesData?.exitRequests ?? [];
    return filterExitRequests(exitRequests, exchangeRate);
  }, [pooledStakesData, exchangeRate]);

  const claimableWei = useMemo(
    () =>
      claimableRequests
        .reduce(
          (acc, { claimedAssets }) =>
            claimedAssets ? acc.add(new BN4(claimedAssets)) : acc,
          new BN4(0),
        )
        .toString(),
    [claimableRequests],
  );

  const hasClaimableWei = !!Number(claimableWei);

  useEffect(() => {
    if (hasStakedPositions && !hasSentViewingStakingRewardsMetric) {
      trackEvent(
        createEventBuilder(
          MetaMetricsEvents.VISITED_ETH_OVERVIEW_WITH_STAKED_POSITIONS,
        )
          .addProperties({
            selected_provider: EVENT_PROVIDERS.CONSENSYS,
            location: EVENT_LOCATIONS.STAKING_BALANCE,
          })
          .build(),
      );

      setHasSentViewingStakingRewardsMetric(true);
    }
  }, [
    createEventBuilder,
    hasSentViewingStakingRewardsMetric,
    hasStakedPositions,
    trackEvent,
  ]);

  if (!isStakingSupportedChain) {
    return null;
  }

  const renderStakingContent = () => {
    if (isLoadingPooledStakesData) {
      return (
        <SkeletonPlaceholder>
          <SkeletonPlaceholder.Item height={50} borderRadius={6} />
        </SkeletonPlaceholder>
      );
    }

    return (
      <>
        {unstakingRequests.map(
          ({ positionTicket, withdrawalTimestamp, assetsToDisplay }) =>
            assetsToDisplay && (
              <UnstakingBanner
                key={positionTicket}
                amountEth={fixDisplayAmount(
                  multiplyValueByPowerOfTen(new bn(assetsToDisplay), -18),
                  4,
                )}
                timeRemaining={
                  !Number(withdrawalTimestamp)
                    ? { days: 0, hours: 0, minutes: 0 } // default to 0 days.
                    : getTimeDifferenceFromNow(Number(withdrawalTimestamp))
                }
                style={styles.bannerStyles}
              />
            ),
        )}

        {hasClaimableWei && (
          <ClaimBanner
            claimableAmount={claimableWei}
            style={styles.bannerStyles}
            asset={asset}
          />
        )}

        <StakingButtons
          asset={asset}
          style={
            hasStakedPositions || hasClaimableWei
              ? undefined
              : styles.buttonsContainer
          }
          hasEthToUnstake={hasEthToUnstake}
          hasStakedPositions={hasStakedPositions}
        />
      </>
    );
  };

  return (
    <View testID="staking-overview-container">
      <View style={styles.container}>{renderStakingContent()}</View>
      <View style={styles.stakingEarnings}>
        <StakingEarnings asset={asset} />
      </View>
    </View>
  );
};

export const StakingOverview = ({ asset }: StakingOverviewProps) =>
  asset.isStaked ? (
    <StakeSDKProvider>
      <StakingOverviewContent asset={asset} />
    </StakeSDKProvider>
  ) : null;

export default StakingOverview;
