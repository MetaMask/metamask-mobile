import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
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
import { truncateNumber } from '../../utils';
import {
  getEarnAssetFiatDisplay,
  hasEarnAssetBalance,
} from '../../utils/earnAssets';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import { useMoneyNavigation } from '../../../Money/hooks/useMoneyNavigation';
import useMoneyAccountVisibility from '../../../Money/hooks/useMoneyAccountVisibility';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import type { EarnAsset } from '../../types/earnAssets';

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

// TODO: Breakout and standardize since we'll use new tag in other places.
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

const renderSuccessChevron = () => (
  <Icon
    name={IconName.ArrowRight}
    color={IconColor.SuccessDefault}
    size={IconSize.Xs}
  />
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

    const { isMoneyAccountVisible } = useMoneyAccountVisibility();

    const sectionViewRef = useRef<View>(null);
    const { assetSlots, hasMoreAssets, moneyApyPercent, isLoading, refresh } =
      useEarnSectionAssets();

    const { totalFiatFormatted: moneyAccountBalanceFiat } =
      useMoneyAccountBalance({ enabled: isMoneyAccountVisible });

    const { isOnboardingRedirectNeeded, navigateToMoneyHome } =
      useMoneyNavigation();

    const earnSectionItemCount =
      assetSlots.length +
      (isMoneyAccountVisible ? 1 : 0) +
      (!isLoading && hasMoreAssets ? 1 : 0);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: sectionViewRef,
      isLoading,
      sectionName: HomeSectionNames.EARN,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: false,
      itemCount: earnSectionItemCount,
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
      (asset: EarnAsset) => {
        if (!hasEarnAssetBalance(asset)) {
          navigation.navigate('Asset', {
            address: asset.address,
            chainId: asset.chainId,
            symbol: asset.symbol,
            name: asset.name,
            decimals: asset.decimals,
            image: asset.image,
            balance: asset.balance ?? '0',
            isNative: asset.isNative,
            isETH: asset.isETH,
            aggregators: asset.aggregators,
            rwaData: asset.rwaData,
            source: TokenDetailsSource.HomeSection,
          });
          return;
        }

        navigation.navigate(Routes.EARN.ROOT, {
          screen: Routes.EARN.STRATEGY_SELECTION,
          params: { assetId: asset.assetId },
        });
      },
      [navigation],
    );

    const handleViewMoreCardPress = () => {
      // eslint-disable-next-line no-alert
      alert('Under construction 🚧');
    };

    const moneyAccountCardSecondaryText = useMemo(() => {
      if (isOnboardingRedirectNeeded && moneyAccountBalanceFiat === '0') {
        return strings('earn_module.get_started');
      }

      if (!isOnboardingRedirectNeeded && moneyAccountBalanceFiat === '0') {
        return strings('earn_module.start_earning');
      }

      return moneyAccountBalanceFiat;
    }, [isOnboardingRedirectNeeded, moneyAccountBalanceFiat]);

    const handleMoneyAccountCardPress = useCallback(() => {
      navigateToMoneyHome();
    }, [navigateToMoneyHome]);

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box testID="earn-section">
          <SectionDivider />
          <SectionHeader
            title={strings('homepage.sections.earn_strategies')}
            isInteractive
            onPress={handleHeaderPress}
            testID={homepageSectionTitleTestId(HomeSectionNames.EARN)}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw.style('gap-3 px-4 pb-3 pt-3')}
          >
            {/* Money Account Card */}
            {isMoneyAccountVisible && (
              <EarnSectionAssetCard
                icon={
                  <MoneyBalanceIcon
                    width={40}
                    height={40}
                    name="money-balance"
                  />
                }
                tag={renderNewTag()}
                primaryText={strings('earn_module.money_account')}
                secondaryText={moneyAccountCardSecondaryText}
                tertiaryText={
                  moneyApyPercent === undefined
                    ? // TODO: Render Loading skeleton for card when rate is loading. Only show rate_unavailable when rate is missing and not actively fetching.
                      strings('earn_module.rate_unavailable')
                    : strings('earn_module.rate_apy', {
                        percentage: truncateNumber(moneyApyPercent),
                      })
                }
                tertiaryAccessory={renderSuccessChevron()}
                testID="earn-section-money-account-card"
                onPress={handleMoneyAccountCardPress}
              />
            )}
            {isLoading
              ? assetSlots.map(({ key }) => renderAssetCardSkeleton(key))
              : assetSlots.map((slot, index) => {
                  if (slot.kind === 'unavailable') {
                    return renderUnavailableAssetCard(slot.key);
                  }

                  const { asset } = slot;
                  const hasAssetBalance = hasEarnAssetBalance(asset);
                  const isApr =
                    asset.highestRateExperience?.rate.type === 'APR';
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
                      icon={renderEarnAssetIcon(asset)}
                      primaryText={asset.ticker ?? asset.symbol}
                      secondaryText={
                        hasAssetBalance
                          ? (getEarnAssetFiatDisplay(asset) ??
                            strings('earn_module.balance_unavailable'))
                          : strings('earn_module.get_started')
                      }
                      tertiaryText={rateText}
                      tertiaryAccessory={
                        hasAssetBalance ? renderSuccessChevron() : undefined
                      }
                      testID={`earn-section-asset-${index}-card`}
                      onPress={() => handleAssetCardPress(asset)}
                    />
                  );
                })}
            {!isLoading && hasMoreAssets && (
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
            )}
          </ScrollView>
        </Box>
      </View>
    );
  },
);

export default React.memo(EarnSection);
