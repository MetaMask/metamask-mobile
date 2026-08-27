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
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import { strings } from '../../../../../../locales/i18n';
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
import EarnAssetIcon from '../EarnAssetIcon/EarnAssetIcon';
import useEarnSectionAssets from '../../hooks/useEarnSectionAssets';
import { truncateNumber } from '../../utils';
import {
  earnAssetToToken,
  getEarnAssetFiatDisplay,
  getEarnAssetMetadata,
  hasEarnAssetSubsidizedFee,
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
import Routes from '../../../../../constants/navigation/Routes';
import { RefreshConfig } from '../../../../Views/TrendingView/hooks/useExploreRefresh';
import { useFeedRefresh } from '../../../../Views/TrendingView/hooks/useFeedRefresh';
import { getEarnAssetRateText } from '../../utils/earnSection/getEarnAssetRateText';
import { EarnSectionTestIds } from './EarnSection.testIds';

interface EarnSectionHomeAnalytics {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

export interface EarnSectionProps {
  tokenDetailsSource: TokenDetailsSource;
  homeAnalytics?: EarnSectionHomeAnalytics;
  showDividers?: boolean;
  refresh?: RefreshConfig;
  enabled?: boolean;
}

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

// Module-level promise to prevent multiple concurrent refreshes.
let refreshPromise: Promise<void> | undefined;

export const resetEarnSectionRefreshForTests = () => {
  refreshPromise = undefined;
};

const EarnSection = forwardRef<SectionRefreshHandle, EarnSectionProps>(
  (
    {
      tokenDetailsSource,
      homeAnalytics,
      showDividers = false,
      refresh: exploreFeedRefreshConfig,
      enabled = true,
    },
    ref,
  ) => {
    const tw = useTailwind();
    const navigation = useNavigation<AppNavigationProp>();
    const isHomepageSection = homeAnalytics !== undefined;
    const homepageTelemetryEnabled = isHomepageSection && enabled;
    const sectionIndex = homeAnalytics?.sectionIndex ?? -1;
    const totalSectionsLoaded = homeAnalytics?.totalSectionsLoaded ?? 0;

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
      refresh: refreshEarnSectionAssets,
    } = useEarnSectionAssets({ enabled });

    const {
      totalFiatFormatted: moneyAccountBalanceFiat,
      totalFiatRaw: moneyAccountBalanceRaw,
      isBalanceLoading: isMoneyAccountBalanceLoading,
      refetchBalance: refetchMoneyAccountBalance,
    } = useMoneyAccountBalance({
      enabled: enabled && isMoneyAccountVisible,
    });

    const { isOnboardingRedirectNeeded, navigateToMoneyHome } =
      useMoneyNavigation();

    const earnSectionItemCount =
      assetSlots.length +
      (isMoneyAccountVisible ? 1 : 0) +
      (!isLoading && hasMoreAssets ? 1 : 0);

    const refresh = useCallback(async () => {
      refreshPromise ??= Promise.all([
        refetchMoneyAccountBalance(),
        refreshEarnSectionAssets(),
      ])
        .then(() => undefined)
        .finally(() => {
          refreshPromise = undefined;
        });

      return refreshPromise;
    }, [refetchMoneyAccountBalance, refreshEarnSectionAssets]);

    const handleExploreFeedRefresh = useCallback(async () => {
      try {
        await refresh();
      } catch (error: unknown) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'EarnSection: Failed to refresh section data',
        );
      }
    }, [refresh]);

    /**
     * Refreshes Earn data when the parent requests a page refresh.
     * Currently used for Explore pull-to-refresh.
     */
    useFeedRefresh(exploreFeedRefreshConfig, handleExploreFeedRefresh, enabled);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: homepageTelemetryEnabled ? sectionViewRef : null,
      isLoading,
      sectionName: HomeSectionNames.EARN,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: false,
      itemCount: earnSectionItemCount,
      fireImmediateWhenNoView: homepageTelemetryEnabled,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.EARN,
      contentReady: !isLoading,
      isEmpty: false,
      isLoading,
      enabled: homepageTelemetryEnabled,
    });

    const handleViewAll = useCallback(() => {
      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.SEARCH_LIST,
      });
    }, [navigation]);

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
            source: tokenDetailsSource,
          });
          return;
        }

        navigation.navigate(Routes.EARN.ROOT, {
          screen: Routes.EARN.STRATEGY_SELECTION,
          params: { assetId: asset.assetId },
        });
      },
      [navigation, tokenDetailsSource],
    );

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

    const renderedAssetCards = useMemo(
      () =>
        assetSlots.map((slot, index) => {
          if (slot.kind === 'unavailable') {
            return renderUnavailableAssetCard(slot.key);
          }

          const { asset } = slot;
          const metadata = getEarnAssetMetadata(asset);
          const hasMinDepositAmount =
            !isEarnAssetBalanceBelowMinDepositAmount(asset);
          const hasSubsidizedFee = hasEarnAssetSubsidizedFee(asset);

          const rateText = getEarnAssetRateText({ asset });

          return (
            <EarnSectionAssetCard
              key={slot.key}
              icon={<EarnAssetIcon token={earnAssetToToken(asset)} />}
              tag={
                hasSubsidizedFee ? (
                  <EarnNoFeeTag
                    testID={EarnSectionTestIds.ASSET_NO_FEE_TAG(index)}
                  />
                ) : undefined
              }
              primaryText={metadata.ticker ?? metadata.symbol}
              secondaryText={
                hasMinDepositAmount
                  ? (getEarnAssetFiatDisplay(asset) ??
                    strings('earn_module.balance_unavailable'))
                  : (metadata.name ?? metadata.ticker ?? metadata.symbol)
              }
              tertiaryText={rateText}
              testID={EarnSectionTestIds.ASSET_CARD(index)}
              onPress={() => handleAssetCardPress(asset)}
            />
          );
        }),
      [assetSlots, handleAssetCardPress],
    );

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box testID="earn-section">
          {showDividers && <SectionDivider />}
          <SectionHeader
            title={strings('homepage.sections.earn')}
            isInteractive
            onPress={handleViewAll}
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
                testID: EarnSectionTestIds.ERROR_RETRY_BUTTON,
              }}
              testID={EarnSectionTestIds.ERROR}
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
                      testID={EarnSectionTestIds.MONEY_ACCOUNT_BALANCE_SKELETON}
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
                      testID={EarnSectionTestIds.MONEY_ACCOUNT_APY_SKELETON}
                    />
                  ) : moneyApyPercent === undefined ? (
                    strings('earn_module.rate_unavailable')
                  ) : (
                    strings('earn_module.rate_apy', {
                      percentage: truncateNumber(moneyApyPercent),
                    })
                  )
                }
                testID={EarnSectionTestIds.MONEY_ACCOUNT_CARD}
                onPress={handleMoneyAccountCardPress}
              />
            )}
            {isLoading
              ? assetSlots.map(({ key }) => renderAssetCardSkeleton(key))
              : renderedAssetCards}
            {!isLoading && hasMoreAssets && (
              <EarnSectionCard
                testID={EarnSectionTestIds.VIEW_MORE_CARD}
                onPress={handleViewAll}
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
