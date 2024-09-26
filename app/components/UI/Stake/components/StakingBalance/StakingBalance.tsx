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
import { GetStakesApiResponse } from './StakingBalance.types';
import { TokenI } from '../../../../UI/Tokens/types';
import { getTimeDifferenceFromNow } from '../../../../../util/date';
import { filterExitRequests } from './utils';
import { BN } from 'ethereumjs-util';
import bn from 'bignumber.js';
import { fixDisplayAmount } from '../../utils/value';
import { multiplyValueByPowerOfTen } from '../../utils/bignumber';

// TODO: Replace mock data when connecting to backend.
const MOCK_STAKED_ETH_ASSET = {
  balance: '4.9999 ETH',
  balanceFiat: '$13,292.20',
  name: 'Staked Ethereum',
  symbol: 'ETH',
} as TokenI;

// TODO: Replace mock data when connecting to backend.
const MOCK_UNSTAKING_REQUESTS: GetStakesApiResponse = {
  accounts: [
    {
      account: '0x0123456789abcdef0123456789abcdef01234567',
      lifetimeRewards: '43927049303048',
      assets: '17913326707142320',
      exitRequests: [
        {
          // Unstaking
          positionTicket: '2153260738145148336740',
          timestamp: '1727110415000',
          totalShares: '989278156820374',
          withdrawalTimestamp: null,
          exitQueueIndex: '-1',
          claimedAssets: null,
          leftShares: null,
        },
        // Requests below are claimable.
        {
          positionTicket: '515964521392314631201',
          timestamp: '1720539311000',
          totalShares: '99473618267007',
          withdrawalTimestamp: '0',
          exitQueueIndex: '57',
          claimedAssets: '100006626507361',
          leftShares: '0',
        },
        {
          positionTicket: '515964620865932898208',
          timestamp: '1720541495000',
          totalShares: '99473618267007',
          withdrawalTimestamp: '0',
          exitQueueIndex: '57',
          claimedAssets: '100006626507361',
          leftShares: '0',
        },
        {
          positionTicket: '516604671289934191921',
          timestamp: '1720607327000',
          totalShares: '1929478758729790',
          withdrawalTimestamp: '0',
          exitQueueIndex: '58',
          claimedAssets: '1939870510970987',
          leftShares: '0',
        },
      ],
    },
  ],
  exchangeRate: '1.010906701603882254',
};

const StakingBalance = () => {
  const { styles } = useStyles(styleSheet, {});

  const networkName = useSelector(selectNetworkName);

  const [isGeoBlocked] = useState(true);

  const { unstakingRequests, claimableRequests } = useMemo(
    () =>
      filterExitRequests(
        MOCK_UNSTAKING_REQUESTS.accounts[0].exitRequests,
        MOCK_UNSTAKING_REQUESTS.exchangeRate,
      ),
    [],
  );

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

  return (
    <View>
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
      <View style={styles.container}>
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
