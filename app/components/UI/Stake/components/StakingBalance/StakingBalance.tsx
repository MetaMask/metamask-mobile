import { Hex } from '@metamask/utils';
import bn from 'bignumber.js';
import BN4 from 'bnjs4';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../component-library/components/Banners/Banner';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import { RootState } from '../../../../../reducers';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { getTimeDifferenceFromNow } from '../../../../../util/date';
import { isPortfolioViewEnabled } from '../../../../../util/networks';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import AssetElement from '../../../AssetElement';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import NetworkMainAssetLogo from '../../../NetworkMainAssetLogo';
import type { TokenI } from '../../../Tokens/types';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import useBalance from '../../hooks/useBalance';
import usePooledStakes from '../../hooks/usePooledStakes';
import { useStakingChainByChainId } from '../../hooks/useStakingChain';
import useStakingEligibility from '../../hooks/useStakingEligibility';
import useVaultApyAverages from '../../hooks/useVaultApyAverages';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import { multiplyValueByPowerOfTen } from '../../utils/bignumber';
import {
  CommonPercentageInputUnits,
  fixDisplayAmount,
  formatPercent,
  PercentageOutputFormat,
} from '../../utils/value';
import styleSheet from './StakingBalance.styles';
import ClaimBanner from './StakingBanners/ClaimBanner/ClaimBanner';
import UnstakingBanner from './StakingBanners/UnstakeBanner/UnstakeBanner';
import StakingButtons from './StakingButtons/StakingButtons';
import StakingCta from './StakingCta/StakingCta';
import { filterExitRequests } from './utils';

export interface StakingBalanceProps {
  asset: TokenI;
}

const StakingBalanceContent = ({ asset }: StakingBalanceProps) => {
  const { styles } = useStyles(styleSheet, {});

  const [
    hasSentViewingStakingRewardsMetric,
    setHasSentViewingStakingRewardsMetric,
  ] = useState(false);

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const { isEligible: isEligibleForPooledStaking } = useStakingEligibility();

  const { isStakingSupportedChain } = useStakingChainByChainId(
    asset.chainId as Hex,
  );

  const { trackEvent, createEventBuilder } = useMetrics();

  const {
    pooledStakesData,
    exchangeRate,
    hasStakedPositions,
    hasEthToUnstake,
    isLoadingPooledStakesData,
  } = usePooledStakes();

  const { vaultApyAverages, isLoadingVaultApyAverages } = useVaultApyAverages()

  const {
    formattedStakedBalanceETH: stakedBalanceETH,
    formattedStakedBalanceFiat: stakedBalanceFiat,
  } = useBalance(asset.chainId as Hex);

  const { unstakingRequests, claimableRequests } = useMemo(() => {
    const exitRequests = pooledStakesData?.exitRequests ?? [];
    return filterExitRequests(exitRequests, exchangeRate);
  }, [pooledStakesData, exchangeRate]);

  const claimableWei = useMemo(
    () =>
      claimableRequests.reduce(
        (acc, { claimedAssets }) =>
          claimedAssets ? acc.add(new BN4(claimedAssets)) : acc,
        new BN4(0),
      ).toString(),
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
    return <></>;
  }

  const renderStakingContent = () => {
    if (isLoadingPooledStakesData) {
      return (
        <SkeletonPlaceholder>
          <SkeletonPlaceholder.Item height={50} borderRadius={6} />
        </SkeletonPlaceholder>
      );
    }

    if (!isEligibleForPooledStaking) {
      return (
        <Banner
          variant={BannerVariant.Alert}
          severity={BannerAlertSeverity.Info}
          description={strings('stake.banner_text.geo_blocked')}
          style={styles.bannerStyles}
        />
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
          />
        )}

        {!hasStakedPositions && !isLoadingVaultApyAverages && (
          <StakingCta
            style={styles.stakingCta}
            estimatedRewardRate={formatPercent(vaultApyAverages.oneWeek, {
              inputFormat: CommonPercentageInputUnits.PERCENTAGE,
              outputFormat: PercentageOutputFormat.PERCENT_SIGN,
              fixed: 1,
            })}
          />
        )}

        <StakingButtons
          asset={asset}
          style={styles.buttonsContainer}
          hasEthToUnstake={hasEthToUnstake}
          hasStakedPositions={hasStakedPositions}
        />
      </>
    );
  };

  return (
    <View testID="staking-balance-container">
      {hasEthToUnstake && !isLoadingPooledStakesData && (
        <AssetElement
          asset={asset}
          mainBalance={stakedBalanceETH}
          balance={stakedBalanceFiat}
        >
          <BadgeWrapper
            style={styles.badgeWrapper}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={NetworkBadgeSource(
                  asset.chainId as Hex,
                  asset.ticker ?? asset.symbol,
                )}
                name={networkConfigurationByChainId?.name}
              />
            }
          >
            {isPortfolioViewEnabled() ? (
              <NetworkAssetLogo
                chainId={asset.chainId as Hex}
                style={styles.ethLogo}
                ticker={asset.symbol}
                big={false}
                biggest={false}
                testID={'staking-balance-asset-logo'}
              />
            ) : (
              <NetworkMainAssetLogo style={styles.ethLogo} />
            )}
          </BadgeWrapper>
          <Text
            style={styles.balances}
            variant={TextVariant.BodyLGMedium}
            testID="staked-ethereum-label"
          >
            {strings('stake.staked_ethereum')}
          </Text>
        </AssetElement>
      )}

      <View style={styles.container}>{renderStakingContent()}</View>
    </View>
  );
};

export const StakingBalance = ({ asset }: StakingBalanceProps) => (
  <StakeSDKProvider>
    <StakingBalanceContent asset={asset} />
  </StakeSDKProvider>
);

export default StakingBalance;
