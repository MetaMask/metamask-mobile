import React, { useMemo } from 'react';
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
import BN4 from 'bnjs4';
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
import useStakingChain from '../../hooks/useStakingChain';
import usePooledStakes from '../../hooks/usePooledStakes';
import useVaultData from '../../hooks/useVaultData';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import type { TokenI } from '../../../Tokens/types';
import useBalance from '../../hooks/useBalance';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { selectChainId } from '../../../../../selectors/networkController';

export interface StakingBalanceProps {
  asset: TokenI;
}

const StakingBalanceContent = ({ asset }: StakingBalanceProps) => {
  const { styles } = useStyles(styleSheet, {});
  const chainId = useSelector(selectChainId);
  const networkName = useSelector(selectNetworkName);

  const { isEligible: isEligibleForPooledStaking } = useStakingEligibility();

  const { isStakingSupportedChain } = useStakingChain();

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
  } = useBalance();

  const { unstakingRequests, claimableRequests } = useMemo(() => {
    const exitRequests = pooledStakesData?.exitRequests ?? [];
    return filterExitRequests(exitRequests, exchangeRate);
  }, [pooledStakesData, exchangeRate]);

  const claimableEth = useMemo(
    () =>
      renderFromWei(
        claimableRequests.reduce(
          (acc, { claimedAssets }) =>
            claimedAssets ? acc.add(new BN4(claimedAssets)) : acc,
          new BN4(0),
        ),
      ),
    [claimableRequests],
  );

  const hasClaimableEth = !!Number(claimableEth);

  if (!isStakingSupportedChain || isLoadingPooledStakesData) {
    return <></>;
  }

  return (
    <View>
      {hasStakedPositions && isEligibleForPooledStaking && (
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
                imageSource={NetworkBadgeSource(chainId, asset.symbol)}
                name={networkName}
              />
            }
          >
            <NetworkMainAssetLogo style={styles.ethLogo} />
          </BadgeWrapper>
          <Text style={styles.balances} variant={TextVariant.BodyLGMedium}>
            {strings('stake.staked_ethereum')}
          </Text>
        </AssetElement>
      )}

      <View style={styles.container}>
        {!isEligibleForPooledStaking ? (
          <Banner
            variant={BannerVariant.Alert}
            severity={BannerAlertSeverity.Warning}
            description={strings('stake.banner_text.geo_blocked')}
            style={styles.bannerStyles}
          />
        ) : (
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
                        ? { days: 11, hours: 0, minutes: 0 } // default to 11 days.
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
        )}
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
