import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
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
  Skeleton,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import { strings } from '../../../../../../locales/i18n';
import type { TokenI } from '../../../Tokens/types';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
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
import useEarnSectionAssets from '../../hooks/useEarnSectionAssets';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { truncateNumber } from '../../utils';

interface EarnSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const renderEarnAssetIcon = (token: TokenI) => {
  const networkImageSource = token.chainId
    ? getNetworkImageSource({ chainId: token.chainId })
    : undefined;

  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        <BadgeNetwork
          name={token.chainId ?? ''}
          src={networkImageSource}
          twClassName="rounded-1"
        />
      }
    >
      <AssetLogo asset={token} />
    </BadgeWrapper>
  );
};

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

const renderAssetCardSkeleton = (key: string) => (
  <EarnSectionCard key={key} testID={key}>
    <Skeleton height={40} width={40} twClassName="rounded-full" />
    <Box twClassName="gap-2">
      <Skeleton height={16} width={64} />
      <Skeleton height={20} width={112} />
      <Skeleton height={20} width={88} />
    </Box>
  </EarnSectionCard>
);

const renderUnavailableAssetCard = (key: string) => (
  <EarnSectionAssetCard
    key={key}
    icon={
      <Icon
        name={IconName.Warning}
        color={IconColor.IconAlternative}
        size={IconSize.Lg}
      />
    }
    primaryText={strings('earn_module.asset_unavailable')}
    secondaryText={strings('earn_module.get_started')}
    tertiaryText={strings('earn_module.rate_unavailable')}
    testID={key}
  />
);

const EarnSection = forwardRef<SectionRefreshHandle, EarnSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const tw = useTailwind();
    const navigation = useNavigation<AppNavigationProp>();

    const sectionViewRef = useRef<View>(null);
    const {
      assetSlots,
      moneyAccountToken,
      moneyApyPercent,
      isLoading,
      refresh,
    } = useEarnSectionAssets();

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: sectionViewRef,
      isLoading,
      sectionName: HomeSectionNames.EARN,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: false,
      // TODO: Breakout 7 into constant.
      itemCount: 7,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.EARN,
      contentReady: !isLoading,
      isEmpty: false,
      isLoading,
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
              tertiaryText={
                moneyApyPercent === undefined
                  ? // TODO: Render Loading skeleton for card when rate is loading. Only show rate_unavailable when rate is missing and not actively fetching.
                    strings('earn_module.rate_unavailable')
                  : strings('earn_module.rate_apy', {
                      percentage: truncateNumber(moneyApyPercent),
                    })
              }
              testID="earn-section-money-account-card"
              onPress={() => handleAssetCardPress(moneyAccountToken)}
            />
            {/* TODO: Bug isLoading is always true */}
            {isLoading
              ? assetSlots.map(({ key }) => renderAssetCardSkeleton(key))
              : assetSlots.map((slot, index) => {
                  if (slot.kind === 'unavailable') {
                    return renderUnavailableAssetCard(slot.key);
                  }

                  const { asset } = slot;
                  const isApr =
                    asset.highestRateExperience?.type ===
                    EARN_EXPERIENCES.STABLECOIN_LENDING;
                  const rateText =
                    asset.highestRatePercent === undefined
                      ? strings('earn_module.rate_unavailable')
                      : strings(
                          isApr
                            ? 'earn_module.rate_apr'
                            : 'earn_module.rate_apy',
                          {
                            percentage: truncateNumber(
                              asset.highestRatePercent,
                            ),
                          },
                        );

                  return (
                    <EarnSectionAssetCard
                      key={slot.key}
                      icon={renderEarnAssetIcon(asset.token)}
                      primaryText={asset.token.ticker ?? asset.token.symbol}
                      secondaryText={
                        asset.hasBalance
                          ? (asset.balanceFiat ??
                            strings('earn_module.balance_unavailable'))
                          : strings('earn_module.get_started')
                      }
                      tertiaryText={rateText}
                      testID={`earn-section-asset-${index}-card`}
                      onPress={() => handleAssetCardPress(asset.token)}
                    />
                  );
                })}
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
