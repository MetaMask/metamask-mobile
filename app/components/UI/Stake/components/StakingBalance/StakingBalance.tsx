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
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
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
import { getDecimalChainId } from '../../../../../util/networks';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import AssetElement from '../../../AssetElement';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
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
import {
  useFeatureFlag,
  FeatureFlagNames,
} from '../../../../../components/hooks/useFeatureFlag';
import PercentageChange from '../../../../../component-library/components-temp/Price/PercentageChange';
import { useTokenPricePercentageChange } from '../../../Tokens/hooks/useTokenPricePercentageChange';
import StakingEarnings from '../StakingEarnings';
import { useTheme } from '../../../../../util/theme';

export interface StakingBalanceProps {
  asset: TokenI;
}

const StakingBalanceContent = ({ asset }: StakingBalanceProps) => {
  const theme = useTheme();

  const [
    hasSentViewingStakingRewardsMetric,
    setHasSentViewingStakingRewardsMetric,
  ] = useState(false);

  const networkConfigurationByChainId = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const isPooledStakingEnabled = useFeatureFlag(
    FeatureFlagNames.earnPooledStakingEnabled,
  );

  const { isEligible: isEligibleForPooledStaking } = useStakingEligibility();
  const { styles } = useStyles(styleSheet, { theme });

  const { isStakingSupportedChain } = useStakingChainByChainId(
    asset.chainId as Hex,
  );

  const { trackEvent, createEventBuilder } = useMetrics();

  const decimalChainId = getDecimalChainId(asset.chainId);
  const {
    pooledStakesData,
    exchangeRate,
    hasStakedPositions,
    hasEthToUnstake,
    isLoadingPooledStakesData,
  } = usePooledStakes(decimalChainId);

  const { vaultApyAverages, isLoadingVaultApyAverages } =
    useVaultApyAverages(decimalChainId);

  const {
    formattedStakedBalanceETH: stakedBalanceETH,
    formattedStakedBalanceFiat: stakedBalanceFiat,
  } = useBalance(asset.chainId as Hex);

  const pricePercentChange1d = useTokenPricePercentageChange(asset);

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
            asset={asset}
          />
        )}

        {!hasStakedPositions &&
          !isLoadingVaultApyAverages &&
          isPooledStakingEnabled && (
            <StakingCta
              chainId={asset.chainId as Hex}
              estimatedRewardRate={formatPercent(vaultApyAverages.oneWeek, {
                inputFormat: CommonPercentageInputUnits.PERCENTAGE,
                outputFormat: PercentageOutputFormat.PERCENT_SIGN,
                fixed: 1,
              })}
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
    <View testID="staking-balance-container">
      {hasEthToUnstake && !isLoadingPooledStakesData && (
        <AssetElement
          asset={asset}
          secondaryBalance={stakedBalanceETH}
          balance={stakedBalanceFiat}
        >
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            style={styles.badgeWrapper}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={NetworkBadgeSource(asset.chainId as Hex)}
                name={networkConfigurationByChainId?.name}
              />
            }
          >
            <NetworkAssetLogo
              chainId={asset.chainId as Hex}
              style={styles.ethLogo}
              ticker={asset.symbol}
              big={false}
              biggest={false}
              testID={'staking-balance-asset-logo'}
            />
          </BadgeWrapper>
          <View style={styles.balances}>
            <Text variant={TextVariant.BodyMD} testID="staked-ethereum-label">
              {strings('stake.staked_ethereum')}
            </Text>
            <Text>
              <PercentageChange value={pricePercentChange1d ?? 0} />
            </Text>
          </View>
        </AssetElement>
      )}
      <View style={styles.container}>{renderStakingContent()}</View>
      <View style={styles.stakingEarnings}>
        <StakingEarnings asset={asset} />
      </View>
    </View>
  );
};

export const StakingBalance = ({ asset }: StakingBalanceProps) => (
  <StakeSDKProvider>
    <StakingBalanceContent asset={asset} />
  </StakeSDKProvider>
);

export default StakingBalance;
