import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  BannerAlert,
  BannerAlertSeverity,
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
  earnAssetToToken,
  getEarnAssetFiatDisplay,
  getEarnAssetMetadata,
} from '../../utils/earnAssets';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import { useMoneyNavigation } from '../../../Money/hooks/useMoneyNavigation';
import { selectIsMoneyAccountVisible } from '../../../Money/selectors/visibility';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import type { EarnAsset } from '../../types/earnAssets';
import EarnNewTag from '../EarnNewTag';
import EarnNoFeeTag from '../EarnNoFeeTag';
import Logger from '../../../../../util/Logger';
import { isEarnAssetBalanceBelowMinDepositAmount } from '../../utils/earnAssets/earnAssetBalance';

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
    secondaryText=""
    tertiaryText={strings('earn_module.rate_unavailable')}
    testID={key}
  />
);

const EarnSection = forwardRef<SectionRefreshHandle, EarnSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const tw = useTailwind();
    const navigation = useNavigation<AppNavigationProp>();

    const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);

    const sectionViewRef = useRef<View>(null);
    const isRetryingRef = useRef(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const {
      assetSlots,
      hasMoreAssets,
      moneyApyPercent,
      moneyRateStatus,
      isLoading,
      hasError,
      refresh,
    } = useEarnSectionAssets();

    const {
      totalFiatFormatted: moneyAccountBalanceFiat,
      totalFiatRaw: moneyAccountBalanceRaw,
      isBalanceLoading: isMoneyAccountBalanceLoading,
    } = useMoneyAccountBalance({ enabled: isMoneyAccountVisible });

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
      alert(
        'Under construction 🚧 - Implement when adding Earn Section to Explore page',
      );
    };

    const handleAssetCardPress = useCallback(
      (asset: EarnAsset) => {
        const token = earnAssetToToken(asset);
        if (isEarnAssetBalanceBelowMinDepositAmount(asset)) {
          navigation.navigate('Asset', {
            address: token.address,
            chainId: token.chainId,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            image: token.image,
            balance: token.balance,
            isNative: token.isNative,
            isETH: token.isETH,
            aggregators: token.aggregators,
            rwaData: token.rwaData,
            source: TokenDetailsSource.HomeSection,
          });
          return;
        }
      },
      [navigation],
    );

    const handleViewMoreCardPress = () => {
      // eslint-disable-next-line no-alert
      alert(
        'Under construction 🚧 - Implement when adding Earn Section to Explore page',
      );
    };

    const moneyAccountCardSecondaryText = useMemo(() => {
      if (isOnboardingRedirectNeeded && moneyAccountBalanceRaw === '0') {
        return strings('earn_module.get_started');
      }

      if (!isOnboardingRedirectNeeded && moneyAccountBalanceRaw === '0') {
        return strings('money.asset_overview.cta.start_earning');
      }

      return (
        moneyAccountBalanceFiat ?? strings('earn_module.balance_unavailable')
      );
    }, [
      isOnboardingRedirectNeeded,
      moneyAccountBalanceFiat,
      moneyAccountBalanceRaw,
    ]);

    const handleMoneyAccountCardPress = useCallback(() => {
      navigateToMoneyHome();
    }, [navigateToMoneyHome]);

    const handleRetry = useCallback(async () => {
      if (isRetryingRef.current) {
        return;
      }

      isRetryingRef.current = true;
      setIsRetrying(true);

      try {
        await refresh();
      } catch (error: unknown) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'EarnSection: Failed to refresh Earn data',
        );
      } finally {
        isRetryingRef.current = false;
        setIsRetrying(false);
      }
    }, [refresh]);

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
          {hasError && (
            <BannerAlert
              severity={BannerAlertSeverity.Warning}
              description={strings('earn_module.assets_unavailable')}
              actionButtonLabel={strings('earn_module.retry')}
              actionButtonOnPress={handleRetry}
              actionButtonProps={{
                isDisabled: isRetrying,
                isLoading: isRetrying,
                testID: 'earn-section-error-retry-button',
              }}
              testID="earn-section-error"
              twClassName="mx-4 mt-3"
            />
          )}
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
                tag={
                  moneyAccountBalanceRaw === '0' ? <EarnNewTag /> : undefined
                }
                primaryText={strings('earn_module.money_account')}
                secondaryText={
                  isMoneyAccountBalanceLoading ? (
                    <Skeleton
                      height={20}
                      width={85}
                      testID="earn-section-money-account-balance-skeleton"
                    />
                  ) : (
                    moneyAccountCardSecondaryText
                  )
                }
                tertiaryText={
                  moneyRateStatus === 'loading' ? (
                    <Skeleton
                      height={20}
                      width={70}
                      testID="earn-section-money-account-apy-skeleton"
                    />
                  ) : moneyApyPercent === undefined ? (
                    strings('earn_module.rate_unavailable')
                  ) : (
                    strings('earn_module.rate_apy', {
                      percentage: truncateNumber(moneyApyPercent),
                    })
                  )
                }
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
                  const metadata = getEarnAssetMetadata(asset);
                  const hasMinDepositAmount =
                    !isEarnAssetBalanceBelowMinDepositAmount(asset);
                  const hasSubsidizedFee = asset.experiences.some(
                    ({ isFeeSubsidized }) => isFeeSubsidized,
                  );
                  const isApr =
                    asset.highestRateExperience?.rate.type === 'APR';
                  const rateText =
                    asset.highestRatePercent === undefined
                      ? strings('earn_module.rate_unavailable')
                      : strings(
                          hasMinDepositAmount
                            ? isApr
                              ? 'earn_module.get_rate_apr'
                              : 'earn_module.get_rate_apy'
                            : isApr
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
                      icon={renderEarnAssetIcon(earnAssetToToken(asset))}
                      tag={
                        hasSubsidizedFee ? (
                          <EarnNoFeeTag
                            testID={`earn-section-asset-${index}-no-fee-tag`}
                          />
                        ) : undefined
                      }
                      primaryText={metadata.ticker ?? metadata.symbol}
                      secondaryText={
                        hasMinDepositAmount
                          ? (getEarnAssetFiatDisplay(asset) ??
                            strings('earn_module.balance_unavailable'))
                          : (metadata.name ??
                            metadata.ticker ??
                            metadata.symbol)
                      }
                      tertiaryText={rateText}
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
