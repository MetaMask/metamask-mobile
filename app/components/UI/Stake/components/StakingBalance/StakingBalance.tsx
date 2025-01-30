import React, { useEffect, useMemo, useState } from 'react';
import { Hex } from '@metamask/utils';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import AssetElement from '../../../AssetElement';
import NetworkMainAssetLogo from '../../../NetworkMainAssetLogo';
import { selectNetworkName } from '../../../../../selectors/networkInfos';
import { useSelector } from 'react-redux';
import styleSheet from './StakingBalance.styles';
import { View } from 'react-native';
import StakingButtons from './StakingButtons/StakingButtons';
import ClaimBanner from './StakingBanners/ClaimBanner/ClaimBanner';
import UnstakingBanner from './StakingBanners/UnstakeBanner/UnstakeBanner';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../component-library/components/Banners/Banner';
import { strings } from '../../../../../../locales/i18n';
import { renderFromWei } from '../../../../../util/number';
import { getTimeDifferenceFromNow } from '../../../../../util/date';
import { filterExitRequests } from './utils';
import { BN } from 'ethereumjs-util';
import bn from 'bignumber.js';
import {
  CommonPercentageInputUnits,
  fixDisplayAmount,
  formatPercent,
  PercentageOutputFormat,
} from '../../utils/value';
import { multiplyValueByPowerOfTen } from '../../utils/bignumber';
import StakingCta from './StakingCta/StakingCta';
import useStakingEligibility from '../../hooks/useStakingEligibility';
import { useStakingChainByChainId } from '../../hooks/useStakingChain';
import usePooledStakes from '../../hooks/usePooledStakes';
import useVaultData from '../../hooks/useVaultData';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import type { TokenI } from '../../../Tokens/types';
import useBalance from '../../hooks/useBalance';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import NetworkAssetLogo from '../../../NetworkAssetLogo';
import { isPortfolioViewEnabled } from '../../../../../util/networks';

export interface StakingBalanceProps {
  asset: TokenI;
}

const StakingBalanceContent = ({ asset }: StakingBalanceProps) => {
  const { styles } = useStyles(styleSheet, {});

  const [
    hasSentViewingStakingRewardsMetric,
    setHasSentViewingStakingRewardsMetric,
  ] = useState(false);

  const networkName = useSelector(selectNetworkName);

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
  const { vaultData } = useVaultData();
  const annualRewardRate = vaultData?.apy || '';

  const {
    formattedStakedBalanceETH: stakedBalanceETH,
    formattedStakedBalanceFiat: stakedBalanceFiat,
  } = useBalance(asset.chainId as Hex);

  const { unstakingRequests, claimableRequests } = useMemo(() => {
    const exitRequests = pooledStakesData?.exitRequests ?? [];
    return filterExitRequests(exitRequests, exchangeRate);
  }, [pooledStakesData, exchangeRate]);

  const claimableEth = useMemo(
    () =>
      renderFromWei(
        claimableRequests.reduce(
          (acc, { claimedAssets }) =>
            claimedAssets ? acc.add(new BN(claimedAssets)) : acc,
          new BN(0),
        ),
      ),
    [claimableRequests],
  );

  const hasClaimableEth = !!Number(claimableEth);

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

        {hasClaimableEth && (
          <ClaimBanner
            claimableAmount={claimableEth}
            style={styles.bannerStyles}
          />
        )}

        {!hasStakedPositions && (
          <StakingCta
            style={styles.stakingCta}
            estimatedRewardRate={formatPercent(annualRewardRate, {
              inputFormat: CommonPercentageInputUnits.PERCENTAGE,
              outputFormat: PercentageOutputFormat.PERCENT_SIGN,
              fixed: 1,
            })}
          />
        )}

        <StakingButtons
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
                name={networkName}
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
          <Text style={styles.balances} variant={TextVariant.BodyLGMedium}>
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
