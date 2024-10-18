import React, { useMemo, useState } from 'react';
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
import images from '../../../../../images/image-icons';
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
import useStakingData from '../../hooks/useStakingData';
import { MOCK_STAKED_ETH_ASSET } from './mockData';
import useStakingChain from '../../hooks/useStakingChain';

const StakingBalance = () => {
  const { styles } = useStyles(styleSheet, {});

  const networkName = useSelector(selectNetworkName);

  const { isConfirmedEligible: isEligibleForPooledStaking } =
    useStakingEligibility();

  const { isStakingSupportedChain } = useStakingChain();

  const { vaultData, pooledStakesData, exchangeRate } = useStakingData();
  const annualRewardRate = vaultData?.apy || '';

  const [hasStakedPositions] = useState(false);

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

  if (!isStakingSupportedChain) {
    return <></>;
  }

  return (
    <View>
      {Boolean(MOCK_STAKED_ETH_ASSET.balance) && isEligibleForPooledStaking && (
        <AssetElement
          asset={MOCK_STAKED_ETH_ASSET}
          mainBalance={MOCK_STAKED_ETH_ASSET.balance}
          balance={MOCK_STAKED_ETH_ASSET.balanceFiat}
        >
          <BadgeWrapper
            style={styles.badgeWrapper}
            badgeElement={
              <Badge
                variant={BadgeVariant.Network}
                imageSource={images.ETHEREUM}
                name={networkName}
              />
            }
          >
            <NetworkMainAssetLogo style={styles.ethLogo} />
          </BadgeWrapper>
          <Text style={styles.balances} variant={TextVariant.BodyLGMedium}>
            {MOCK_STAKED_ETH_ASSET.name || MOCK_STAKED_ETH_ASSET.symbol}
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

            <StakingButtons style={styles.buttonsContainer} />
          </>
        )}
      </View>
    </View>
  );
};

export default StakingBalance;
