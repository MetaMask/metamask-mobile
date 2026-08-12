import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { ScrollView, View } from 'react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
  SectionHeader,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import { getAssetImageUrl } from '../../../Bridge/hooks/useAssetMetadata/utils';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import { strings } from '../../../../../../locales/i18n';
import { MUSD_TOKEN_ADDRESS } from '../../constants/musd';
import type { TokenI } from '../../../Tokens/types';
import EarnSectionAssetCard from '../EarnSectionAssetCard';
import EarnSectionCard from '../EarnSectionCard';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { homepageSectionTitleTestId } from '../../../../Views/Homepage/Homepage.testIds';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../../../Views/Homepage/hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../../../Views/Homepage/hooks/useSectionPerformance';
import type { SectionRefreshHandle } from '../../../../Views/Homepage/types';
import { useNavigation } from '@react-navigation/native';

interface EarnSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

interface EarnAssetIcon {
  name: string;
  address?: string;
}

interface EarnSectionAssetCardConfig {
  key: string;
  icon: EarnAssetIcon;
  token: TokenI;
  primaryTextKey: string;
  secondaryTextKey: string;
  tertiaryTextKey: string;
}

// TODO: Replace with actual held assets, lending markets, and staking assets (ETH and TRX).
const EARN_ASSET_CHAIN_ID = CHAIN_IDS.MAINNET;
const EARN_ASSET_NETWORK_NAME = 'Ethereum';
const EARN_ASSET_NETWORK_IMAGE_SOURCE = getNetworkImageSource({
  chainId: EARN_ASSET_CHAIN_ID,
});

const createTemporaryToken = (
  symbol: string,
  address: string,
  decimals: number,
): TokenI => ({
  address,
  decimals,
  image: '',
  name: symbol,
  symbol,
  balance: '0',
  logo: undefined,
  isETH: symbol === 'ETH',
  chainId: EARN_ASSET_CHAIN_ID,
});

const MONEY_ACCOUNT_TOKEN = createTemporaryToken(
  'USDC',
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  6,
);

const TEMP_EARN_ASSET_CARD_CONFIGS: EarnSectionAssetCardConfig[] = [
  {
    key: 'usdc',
    icon: {
      name: 'USDC',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    },
    token: createTemporaryToken(
      'USDC',
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      6,
    ),
    primaryTextKey: 'earn_module.usdc',
    secondaryTextKey: 'earn_module.usdc_balance',
    tertiaryTextKey: 'earn_module.stablecoin_apy',
  },
  {
    key: 'usdt',
    icon: {
      name: 'USDT',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    },
    token: createTemporaryToken(
      'USDT',
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      6,
    ),
    primaryTextKey: 'earn_module.usdt',
    secondaryTextKey: 'earn_module.usdt_balance',
    tertiaryTextKey: 'earn_module.stablecoin_apy',
  },
  {
    key: 'musd',
    icon: {
      name: 'mUSD',
      address: MUSD_TOKEN_ADDRESS,
    },
    token: createTemporaryToken('mUSD', MUSD_TOKEN_ADDRESS, 18),
    primaryTextKey: 'earn_module.musd',
    secondaryTextKey: 'earn_module.musd_balance',
    tertiaryTextKey: 'earn_module.stablecoin_apy',
  },
  {
    key: 'ausdc',
    icon: {
      name: 'aUSDC',
      address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
    },
    token: createTemporaryToken(
      'aUSDC',
      '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
      6,
    ),
    primaryTextKey: 'earn_module.ausdc',
    secondaryTextKey: 'earn_module.ausdc_balance',
    tertiaryTextKey: 'earn_module.stablecoin_apy',
  },
  {
    key: 'eth',
    icon: {
      name: 'ETH',
    },
    token: createTemporaryToken('ETH', '', 18),
    primaryTextKey: 'earn_module.eth',
    secondaryTextKey: 'earn_module.eth_balance',
    tertiaryTextKey: 'earn_module.eth_apr',
  },
];

const renderEarnAssetIcon = (icon: EarnAssetIcon) => (
  <BadgeWrapper
    position={BadgeWrapperPosition.BottomRight}
    badge={
      <BadgeNetwork
        name={EARN_ASSET_NETWORK_NAME}
        src={EARN_ASSET_NETWORK_IMAGE_SOURCE}
        twClassName="rounded-1"
      />
    }
  >
    <AvatarToken
      name={icon.name}
      src={
        icon.address
          ? { uri: getAssetImageUrl(icon.address, EARN_ASSET_CHAIN_ID) }
          : EARN_ASSET_NETWORK_IMAGE_SOURCE
      }
      size={AvatarTokenSize.Lg}
    />
  </BadgeWrapper>
);

const renderNewTag = () => (
  <Tag
    severity={TagSeverity.Info}
    startAccessory={
      <Icon
        name={IconName.Sparkle}
        color={IconColor.PrimaryDefault}
        size={IconSize.Xs}
      />
    }
  >
    <Text variant={TextVariant.BodyXs} color={TextColor.PrimaryDefault}>
      {strings('earn_module.new_tag')}
    </Text>
  </Tag>
);

const EarnSection = forwardRef<SectionRefreshHandle, EarnSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const tw = useTailwind();
    const navigation = useNavigation<AppNavigationProp>();

    const sectionViewRef = useRef<View>(null);

    // TODO: Wire actual refresh logic.
    const refresh = useCallback(async () => undefined, []);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    // TODO: Update params when wiring up real data.
    const { onLayout } = useHomeViewedEvent({
      sectionRef: sectionViewRef,
      isLoading: false,
      sectionName: HomeSectionNames.EARN,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: false,
      itemCount: 7,
    });

    // TODO: Update params when wiring up real data.
    useSectionPerformance({
      sectionId: HomeSectionNames.EARN,
      contentReady: true,
      isEmpty: false,
      isLoading: false,
      enabled: true,
    });

    const handleHeaderPress = () => {
      // eslint-disable-next-line no-alert
      alert('Under construction 🚧');
    };

    const handleAssetCardPress = useCallback(
      (token: TokenI) => {
        navigation.navigate(Routes.EARN.ROOT, {
          screen: Routes.EARN.STRATEGY_SELECTION,
          params: { token },
        });
      },
      [navigation],
    );

    const handleViewMoreCardPress = () => {
      // eslint-disable-next-line no-alert
      alert('Under construction 🚧');
    };

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box testID="earn-section">
          <SectionDivider />
          <SectionHeader
            title={strings('homepage.sections.earn')}
            isInteractive
            onPress={handleHeaderPress}
            testID={homepageSectionTitleTestId(HomeSectionNames.EARN)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('gap-3 px-4 pb-3 pt-3')}
          >
            <EarnSectionAssetCard
              icon={
                <MoneyBalanceIcon width={40} height={40} name="money-balance" />
              }
              tag={renderNewTag()}
              primaryText={strings('earn_module.money_account')}
              secondaryText={strings('earn_module.get_started')}
              tertiaryText={strings('earn_module.money_apy')}
              testID="earn-section-money-account-card"
              onPress={() => handleAssetCardPress(MONEY_ACCOUNT_TOKEN)}
            />
            {TEMP_EARN_ASSET_CARD_CONFIGS.map(
              ({
                key,
                icon,
                token,
                primaryTextKey,
                secondaryTextKey,
                tertiaryTextKey,
              }) => (
                <EarnSectionAssetCard
                  key={key}
                  icon={renderEarnAssetIcon(icon)}
                  primaryText={strings(primaryTextKey)}
                  secondaryText={strings(secondaryTextKey)}
                  tertiaryText={strings(tertiaryTextKey)}
                  testID={`earn-section-${key}-card`}
                  onPress={() => handleAssetCardPress(token)}
                />
              ),
            )}
            <EarnSectionCard
              testID="earn-section-view-more-card"
              onPress={handleViewMoreCardPress}
            >
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="w-full flex-1 gap-2"
              >
                <Icon name={IconName.ArrowRight} size={IconSize.Md} />
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  numberOfLines={1}
                >
                  {strings('earn_module.view_more')}
                </Text>
              </Box>
            </EarnSectionCard>
          </ScrollView>
        </Box>
      </View>
    );
  },
);

export default React.memo(EarnSection);
