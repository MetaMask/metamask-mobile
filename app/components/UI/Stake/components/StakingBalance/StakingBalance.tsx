import React, { useState } from 'react';
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

// TODO: Replace mock data when connecting to backend.
const MOCK_STAKED_ETH_ASSET = {
  balance: '4.9999 ETH',
  balanceFiat: '$13,292.20',
  name: 'Staked Ethereum',
  symbol: 'ETH',
};

// TODO: Replace mock data when connecting to backend.
const MOCK_UNSTAKING_REQUESTS = [
  {
    id: 1,
    amountEth: '2.0',
    timeRemaining: {
      days: 4,
      hours: 2,
    },
  },
  // 1 day and hour to test singular copy (e.g. day vs. days)
  {
    id: 2,
    amountEth: '0.51',
    timeRemaining: {
      days: 1,
      hours: 1,
    },
  },
];

const StakingBalance = () => {
  const { styles } = useStyles(styleSheet, {});

  const networkName = useSelector(selectNetworkName);

  const [hasClaimableEth] = useState(true);
  const [isGeoBlocked] = useState(true);

  return (
    <View>
      <AssetElement
        //   @ts-expect-error Using mock data temporarily until we fetch it from the backend.
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
      <View style={styles.container}>
        {MOCK_UNSTAKING_REQUESTS.map(({ id, amountEth, timeRemaining }) => (
          <UnstakingBanner
            key={id}
            amountEth={amountEth}
            timeRemaining={timeRemaining}
            style={styles.bannerStyles}
          />
        ))}
        {hasClaimableEth && (
          <ClaimBanner claimableAmount="2.0" style={styles.bannerStyles} />
        )}
        {isGeoBlocked && (
          <Banner
            variant={BannerVariant.Alert}
            severity={BannerAlertSeverity.Warning}
            description={strings('stake.banner_text.geo_blocked')}
            style={styles.bannerStyles}
          />
        )}
        <View style={styles.buttonsContainer}>
          <StakingButtons />
        </View>
      </View>
    </View>
  );
};

export default StakingBalance;
