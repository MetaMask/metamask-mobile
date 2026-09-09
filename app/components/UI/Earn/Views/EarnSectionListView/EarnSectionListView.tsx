import React, { useCallback, useMemo, useRef, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  SectionDivider,
  SensitiveText,
  SensitiveTextLength,
  Skeleton,
  TabEmptyState,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { Asset } from '@metamask/assets-controllers';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Logger from '../../../../../util/Logger';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { selectIsMoneyAccountVisible } from '../../../Money/selectors/visibility';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import { useMoneyAccountDeposit } from '../../../Money/hooks/useMoneyAccount';
import { useMoneyAnalytics } from '../../../Money/hooks/useMoneyAnalytics';
import useMountEffect from '../../../Money/hooks/useMountEffect';
import { useProjectedEarnings } from '../../../Money/hooks/useProjectedEarnings';
import type { MoneyDepositAsset } from '../../../Money/selectors/depositTokens';
import PotentialEarningsTokenRow from '../../../Money/components/MoneyPotentialEarnings/PotentialEarningsTokenRow';
import {
  useMoneyNavigation,
  useMoneyOnboardingNavigation,
} from '../../../Money/hooks/useMoneyNavigation';
import { moneyFormatFiat } from '../../../Money/utils/moneyFormatFiat';
import { isPositiveNumber } from '../../../Money/utils/number';
import useEarnOpportunityNavigation, {
  getEarnOpportunityRedirectTarget,
} from '../../hooks/useEarnOpportunityNavigation';
import useEarnAssetCatalogue from '../../hooks/useEarnAssetCatalogue';
import EarnSearchAssetRow from '../../../../Views/TrendingView/feeds/earn/EarnSearchAssetRow';
import EarnMoneyAccountRow from '../../../../Views/TrendingView/feeds/earn/EarnMoneyAccountRow';
import type { EarnAssetSearchItem } from '../../../../Views/TrendingView/feeds/earn/earnSearchTypes';
import {
  deriveMoneyDepositAssets,
  hasEarnAssetSubsidizedFee,
} from '../../utils/earnAssets';
import { rankEarnAssets } from '../../utils/earnSection';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import type { EarnScreensStackParamList } from '../../types/navigation';
import {
  COMPONENT_NAMES as MONEY_COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
} from '../../../Money/constants/moneyEvents';
import {
  EARN_MODULE_BUTTON_INTENTS,
  EARN_MODULE_BUTTON_TYPES,
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../../constants/earnModuleEvents';
import { useEarnAnalytics } from '../../hooks/useEarnAnalytics';
import { getEarnModuleAssetProperties } from '../../utils/earnModuleAnalytics';
import { MoneyPostOnboardingRedirectType } from '../../../Money/types/navigation';
import { EARN_SECTION_LIST_TEST_IDS } from './EarnSectionListView.testIds';

const SUPPORTED_MORE_WAYS_EXPERIENCES = new Set<EARN_EXPERIENCES>([
  EARN_EXPERIENCES.STABLECOIN_LENDING,
  EARN_EXPERIENCES.POOLED_STAKING,
  EARN_EXPERIENCES.TRX_STAKING,
]);

const EarnSectionListSkeleton = () => (
  <Box testID={EARN_SECTION_LIST_TEST_IDS.LIST_LOADING} twClassName="px-4">
    {Array.from({ length: 8 }, (_, index) => (
      <Box
        key={`earn-section-list-skeleton-${index}`}
        twClassName="flex-row items-center gap-3 py-3"
      >
        <Skeleton height={40} width={40} twClassName="rounded-full" />
        <Box twClassName="flex-1 gap-2">
          <Skeleton height={16} width={112} />
          <Skeleton height={20} width={88} />
        </Box>
        <Skeleton height={20} width={70} />
      </Box>
    ))}
  </Box>
);

const EarnSectionListSubtitle = ({ testID }: { testID?: string }) => (
  <Text
    testID={testID}
    variant={TextVariant.BodyMd}
    color={TextColor.TextAlternative}
    twClassName="pt-2 pb-1"
  >
    {strings('earn_module.stake_or_lend_description')}
  </Text>
);

const MoneyProjection = ({
  totalAssetsFiat,
  projectedAmount,
  currency,
  privacyMode,
  isLoading,
  onProjectionPress,
}: {
  totalAssetsFiat: number;
  projectedAmount: number;
  currency: string;
  privacyMode: boolean;
  isLoading: boolean;
  onProjectionPress: () => void;
}) => {
  const hasPositiveProjection =
    isPositiveNumber(projectedAmount) && isPositiveNumber(totalAssetsFiat);

  if (isLoading) {
    return (
      <Box
        testID={EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION_SKELETON}
        twClassName="px-4 py-3 gap-3"
      >
        <Skeleton height={40} width="100%" twClassName="rounded-lg" />
      </Box>
    );
  }

  return (
    <Box
      testID={EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION}
      twClassName="px-4 py-3 gap-3"
    >
      {hasPositiveProjection ? (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {`${strings(
            'money.potential_earnings.description_with_amounts_prefix',
          )} `}
          <SensitiveText
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
            testID={EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION_TOTAL}
          >
            {moneyFormatFiat(new BigNumber(totalAssetsFiat), currency)}
          </SensitiveText>
          {` ${strings(
            'money.potential_earnings.description_with_amounts_middle',
          )} `}
          <SensitiveText
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
            twClassName="underline"
            isHidden={privacyMode}
            length={SensitiveTextLength.Short}
            testID={EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION_PROJECTED}
            onPress={onProjectionPress}
          >
            {`+${moneyFormatFiat(new BigNumber(projectedAmount), currency)}`}
          </SensitiveText>

          {` ${strings('money.potential_earnings.description_with_amounts_suffix')}`}
        </Text>
      ) : (
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {strings('earn_module.money_fallback_description')}
        </Text>
      )}
    </Box>
  );
};

const MAX_VISIBLE_MONEY_ASSETS = 5;

/**
 * Displays the Earn eligible assets and Money projections.
 */
const EarnSectionListView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { params } =
    useRoute<RouteProp<EarnScreensStackParamList, 'EarnSearchList'>>();
  const insets = useSafeAreaInsets();
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const privacyMode = useSelector(selectPrivacyMode);
  const {
    assets,
    hasError,
    isLoading,
    moneyApyPercent,
    moneyRateStatus,
    refresh,
  } = useEarnAssetCatalogue();

  const {
    totalFiatRaw: moneyAccountBalanceRaw,
    totalFiatFormatted: moneyAccountBalanceFiat,
    isBalanceLoading: isMoneyAccountBalanceLoading,
    refetchBalance: refetchMoneyAccountBalance,
  } = useMoneyAccountBalance({ enabled: isMoneyAccountVisible });
  const { isOnboardingRedirectNeeded, navigateToMoneyHome } =
    useMoneyNavigation();
  const { redirectToOnboardingIfNeeded } = useMoneyOnboardingNavigation();
  const { navigateFromEarnAsset } = useEarnOpportunityNavigation();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const {
    trackButtonClicked: trackMoneyButtonClicked,
    trackSurfaceClicked: trackMoneySurfaceClicked,
    trackTokenButtonClicked,
    trackTokenSurfaceClicked,
    trackTooltipClicked,
  } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.EARN_SECTION_LIST_VIEW,
  });
  const {
    trackScreenViewed: trackEarnScreenViewed,
    trackButtonClicked: trackEarnButtonClicked,
    trackSurfaceClicked: trackEarnSurfaceClicked,
  } = useEarnAnalytics({
    screen_name: EARN_MODULE_SCREEN_NAMES.EARN_SECTION_LIST_VIEW,
    entry_point:
      params?.analyticsContext?.entry_point ??
      EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
  });
  const retryInFlightRef = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useMountEffect(trackEarnScreenViewed);

  const handleBack = useCallback(() => {
    trackEarnButtonClicked({
      button_type: EARN_MODULE_BUTTON_TYPES.ICON,
      button_intent: EARN_MODULE_BUTTON_INTENTS.GO_BACK,
    });
    navigation.goBack();
  }, [navigation, trackEarnButtonClicked]);

  const rankedAssets = useMemo(() => rankEarnAssets(assets), [assets]);
  const moneyAssets = useMemo(
    () => deriveMoneyDepositAssets(rankedAssets),
    [rankedAssets],
  );

  const { totalAssetsFiat, projectedAmount, currency } = useProjectedEarnings(
    moneyAssets,
    moneyApyPercent === undefined ? undefined : moneyApyPercent / 100,
  );

  const moneyFeeByToken = useMemo(
    () =>
      new Map<Asset, boolean>(
        assets.flatMap((asset) =>
          asset.kind === 'held' &&
          asset.experiences.some(({ type }) => type === 'MONEY_ACCOUNT_DEPOSIT')
            ? [[asset.asset, hasEarnAssetSubsidizedFee(asset)]]
            : [],
        ),
      ),
    [assets],
  );

  const isNoFeeToken = useCallback(
    (token: MoneyDepositAsset) => moneyFeeByToken.get(token) ?? false,
    [moneyFeeByToken],
  );

  const moreWaysAssets = useMemo(() => {
    const supportedAssets = rankedAssets.flatMap((asset) => {
      const experiences = asset.experiences.filter(({ type }) =>
        SUPPORTED_MORE_WAYS_EXPERIENCES.has(type as EARN_EXPERIENCES),
      );

      return experiences.length > 0 ? [{ ...asset, experiences }] : [];
    });

    return rankEarnAssets(supportedAssets);
  }, [rankedAssets]);

  const moneyAccountItem = useMemo(
    () => ({
      kind: 'money-account' as const,
      id: 'money-account' as const,
      balanceRaw: moneyAccountBalanceRaw,
      balanceFiat: moneyAccountBalanceFiat,
      isBalanceLoading: isMoneyAccountBalanceLoading,
      apyPercent: moneyApyPercent,
      rateStatus: moneyRateStatus,
    }),
    [
      isMoneyAccountBalanceLoading,
      moneyAccountBalanceFiat,
      moneyAccountBalanceRaw,
      moneyApyPercent,
      moneyRateStatus,
    ],
  );

  const handleItemPress = useCallback(
    (item: EarnAssetSearchItem, position: number) => {
      trackEarnSurfaceClicked({
        component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SECTION_LIST_ASSET_ROW,
        ...getEarnModuleAssetProperties(
          item.asset,
          position,
          moreWaysAssets.length,
        ),
        redirect_target: getEarnOpportunityRedirectTarget(
          item.asset,
          // isMoneyOnboardingRedirectNeeded is always false here since this handler is for non-Money deposit experiences.
          false,
        ),
      });
      navigateFromEarnAsset(item.asset, TokenDetailsSource.ExploreEarn, {
        entry_point:
          params?.analyticsContext?.entry_point ??
          EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
        screen_name: EARN_MODULE_SCREEN_NAMES.EARN_SECTION_LIST_VIEW,
        asset_position: position,
        assets_in_list: moreWaysAssets.length,
      });
    },
    [
      moreWaysAssets.length,
      navigateFromEarnAsset,
      params?.analyticsContext?.entry_point,
      trackEarnSurfaceClicked,
    ],
  );

  const handleDeposit = useCallback(
    async (token: MoneyDepositAsset) => {
      try {
        const preferredPaymentToken = {
          address: token.address,
          chainId: token.chainId,
        };

        const redirectedToOnboarding = redirectToOnboardingIfNeeded({
          postOnboardingRedirect: {
            type: MoneyPostOnboardingRedirectType.DEPOSIT,
            preferredPaymentToken,
          },
        });

        if (redirectedToOnboarding) {
          return;
        }

        await initiateDeposit({
          preferredPaymentToken,
        });
      } catch (error: unknown) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          '[EarnSectionListView] Failed to initiate deposit',
        );
      }
    },
    [initiateDeposit, redirectToOnboardingIfNeeded],
  );

  const handleMoneyAccountPress = useCallback(() => {
    trackMoneySurfaceClicked({
      component_name: MONEY_COMPONENT_NAMES.MONEY_ACCOUNT_ROW,
      redirect_target: isOnboardingRedirectNeeded
        ? SCREEN_NAMES.MONEY_ONBOARDING
        : SCREEN_NAMES.MONEY_HOME,
    });
    navigateToMoneyHome({ pop: false });
  }, [
    isOnboardingRedirectNeeded,
    navigateToMoneyHome,
    trackMoneySurfaceClicked,
  ]);

  const handleTokenCardPress = useCallback(
    async (token: MoneyDepositAsset, tokenIndex: number) => {
      trackTokenSurfaceClicked({
        component_name:
          MONEY_COMPONENT_NAMES.MONEY_POTENTIAL_EARNINGS_TOKEN_ROW,
        redirect_target: isOnboardingRedirectNeeded
          ? SCREEN_NAMES.MONEY_ONBOARDING
          : SCREEN_NAMES.MONEY_DEPOSIT,
        token_symbol: token.symbol,
        token_position_in_list: tokenIndex + 1,
        token_chain_id: token.chainId ?? '',
        tokens_in_list: Math.min(moneyAssets.length, MAX_VISIBLE_MONEY_ASSETS),
        token_has_balance: new BigNumber(token.balance).gt(0),
      });
      await handleDeposit(token);
    },
    [
      handleDeposit,
      isOnboardingRedirectNeeded,
      moneyAssets.length,
      trackTokenSurfaceClicked,
    ],
  );

  const handleTokenButtonPress = useCallback(
    async (token: MoneyDepositAsset, tokenIndex: number) => {
      trackTokenButtonClicked({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        component_name:
          MONEY_COMPONENT_NAMES.MONEY_POTENTIAL_EARNINGS_TOKEN_ROW,
        label_key: 'money.potential_earnings.add',
        redirect_target: isOnboardingRedirectNeeded
          ? SCREEN_NAMES.MONEY_ONBOARDING
          : SCREEN_NAMES.MONEY_DEPOSIT,
        token_symbol: token.symbol,
        token_position_in_list: tokenIndex + 1,
        token_chain_id: token.chainId ?? '',
        tokens_in_list: Math.min(moneyAssets.length, MAX_VISIBLE_MONEY_ASSETS),
        token_has_balance: new BigNumber(token.balance).gt(0),
      });
      await handleDeposit(token);
    },
    [
      handleDeposit,
      isOnboardingRedirectNeeded,
      moneyAssets.length,
      trackTokenButtonClicked,
    ],
  );

  const handleViewAllMoney = useCallback(() => {
    trackMoneyButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.VIEW_ALL,
      label_key: 'money.potential_earnings.view_all',
      redirect_target: SCREEN_NAMES.MONEY_POTENTIAL_EARNINGS,
    });
    navigation.navigate(Routes.MONEY.POTENTIAL_EARNINGS);
  }, [navigation, trackMoneyButtonClicked]);

  const handleRetry = useCallback(async () => {
    if (retryInFlightRef.current) {
      return;
    }

    retryInFlightRef.current = true;
    trackEarnButtonClicked({
      button_type: EARN_MODULE_BUTTON_TYPES.TEXT,
      button_intent: EARN_MODULE_BUTTON_INTENTS.RETRY,
      label_key: 'earn_module.retry',
    });
    setIsRetrying(true);

    try {
      await Promise.all([refresh(), refetchMoneyAccountBalance()]);
    } catch (error: unknown) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        '[EarnSectionListView] Failed to refresh Earn data',
      );
    } finally {
      retryInFlightRef.current = false;
      setIsRetrying(false);
    }
  }, [refresh, refetchMoneyAccountBalance, trackEarnButtonClicked]);

  const renderItem: ListRenderItem<EarnAssetSearchItem> = useCallback(
    ({ item, index }) => (
      <EarnSearchAssetRow
        item={item}
        onPress={() => handleItemPress(item, index + 1)}
        privacyMode={privacyMode}
      />
    ),
    [handleItemPress, privacyMode],
  );

  const keyExtractor = useCallback((item: EarnAssetSearchItem) => item.id, []);

  const handleEarningsProjectionPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.EARN_ON_YOUR_CRYPTO,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
      component_name: MONEY_COMPONENT_NAMES.MONEY_BALANCE_PROJECTION,
    });
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
    });
  }, [navigation, trackTooltipClicked]);

  const listHeader = useMemo(() => {
    const errorBanner = hasError ? (
      <Box twClassName="px-4">
        <BannerAlert
          severity={BannerAlertSeverity.Warning}
          description={strings('earn_module.assets_unavailable')}
          actionButtonLabel={strings('earn_module.retry')}
          actionButtonOnPress={handleRetry}
          actionButtonProps={{
            isDisabled: isRetrying,
            isLoading: isRetrying,
            testID: EARN_SECTION_LIST_TEST_IDS.ERROR_RETRY,
          }}
          testID={EARN_SECTION_LIST_TEST_IDS.ERROR}
        />
      </Box>
    ) : null;

    if (!isMoneyAccountVisible) {
      return (
        <Box>
          <Text variant={TextVariant.HeadingLg} twClassName="px-4 pt-2">
            {strings('money.potential_earnings.title')}
          </Text>
          <Box twClassName="px-4 py-2">
            <EarnSectionListSubtitle />
            {errorBanner}
          </Box>
        </Box>
      );
    }

    const visibleMoneyAssets = isLoading
      ? []
      : moneyAssets.slice(0, MAX_VISIBLE_MONEY_ASSETS);

    return (
      <>
        <Text variant={TextVariant.HeadingLg} twClassName="px-4 pt-2">
          {strings('money.potential_earnings.title')}
        </Text>
        <MoneyProjection
          totalAssetsFiat={totalAssetsFiat}
          projectedAmount={projectedAmount}
          currency={currency}
          privacyMode={privacyMode}
          isLoading={isLoading}
          onProjectionPress={handleEarningsProjectionPress}
        />
        <EarnMoneyAccountRow
          item={moneyAccountItem}
          onPress={handleMoneyAccountPress}
          isOnboardingRedirectNeeded={isOnboardingRedirectNeeded}
          privacyMode={privacyMode}
        />
        {visibleMoneyAssets.map((token, index) => (
          <PotentialEarningsTokenRow
            key={`${token.address}-${token.chainId}`}
            token={token}
            hasSubsidizedFee={isNoFeeToken(token)}
            apyDecimal={
              moneyApyPercent === undefined ? 0 : moneyApyPercent / 100
            }
            onCardPress={() => handleTokenCardPress(token, index)}
            onButtonPress={() => handleTokenButtonPress(token, index)}
            testID={EARN_SECTION_LIST_TEST_IDS.MONEY_TOKEN_ROW(index)}
            privacyMode={privacyMode}
          />
        ))}
        {errorBanner}

        {moneyAssets.length > 5 && !isLoading && (
          <Box twClassName="px-4 py-3">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={handleViewAllMoney}
              testID={EARN_SECTION_LIST_TEST_IDS.MONEY_VIEW_ALL}
            >
              {strings('money.potential_earnings.view_all')}
            </Button>
          </Box>
        )}
        {!isLoading && moreWaysAssets.length > 0 && (
          <>
            <SectionDivider testID={EARN_SECTION_LIST_TEST_IDS.DIVIDER} />
            <Box twClassName="px-4 py-3 gap-1">
              <Text
                variant={TextVariant.HeadingLg}
                testID={EARN_SECTION_LIST_TEST_IDS.MORE_WAYS_TITLE}
              >
                {strings('earn_module.more_ways_to_earn')}
              </Text>
              <EarnSectionListSubtitle
                testID={EARN_SECTION_LIST_TEST_IDS.MORE_WAYS_SUBTITLE}
              />
            </Box>
          </>
        )}
      </>
    );
  }, [
    currency,
    handleEarningsProjectionPress,
    handleRetry,
    handleMoneyAccountPress,
    handleTokenCardPress,
    handleTokenButtonPress,
    handleViewAllMoney,
    hasError,
    isLoading,
    isOnboardingRedirectNeeded,
    isMoneyAccountVisible,
    isNoFeeToken,
    isRetrying,
    moneyAccountItem,
    moneyApyPercent,
    moneyAssets,
    privacyMode,
    projectedAmount,
    totalAssetsFiat,
    moreWaysAssets.length,
  ]);

  const listEmptyComponent = useMemo(
    () =>
      isLoading ? (
        <EarnSectionListSkeleton />
      ) : isMoneyAccountVisible ? null : (
        <Box
          testID={EARN_SECTION_LIST_TEST_IDS.EMPTY}
          twClassName="flex-1 items-center justify-center pt-4"
        >
          <TabEmptyState
            description={strings('earn_module.empty_state_description')}
          />
        </Box>
      ),
    [isMoneyAccountVisible, isLoading],
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <Box
        style={{ paddingTop: insets.top }}
        testID={EARN_SECTION_LIST_TEST_IDS.HEADER}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-3"
        >
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={handleBack}
            testID={EARN_SECTION_LIST_TEST_IDS.HEADER_BACK_BUTTON}
          />
        </Box>
      </Box>
      <FlashList
        data={
          isLoading
            ? []
            : moreWaysAssets.map((asset) => ({
                kind: 'asset' as const,
                id: asset.assetId,
                asset,
              }))
        }
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID={EARN_SECTION_LIST_TEST_IDS.LIST}
        maintainVisibleContentPosition={{ disabled: true }}
        style={{ paddingBottom: insets.bottom }}
      />
    </Box>
  );
};

export default EarnSectionListView;
