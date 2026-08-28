import React, { useCallback, useMemo, useRef, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { useProjectedEarnings } from '../../../Money/hooks/useProjectedEarnings';
import type { MoneyDepositAsset } from '../../../Money/selectors/depositTokens';
import PotentialEarningsTokenRow from '../../../Money/components/MoneyPotentialEarnings/PotentialEarningsTokenRow';
import {
  useMoneyNavigation,
  useMoneyOnboardingNavigation,
} from '../../../Money/hooks/useMoneyNavigation';
import { moneyFormatFiat } from '../../../Money/utils/moneyFormatFiat';
import { isPositiveNumber } from '../../../Money/utils/number';
import useEarnOpportunityNavigation from '../../hooks/useEarnOpportunityNavigation';
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
}: {
  totalAssetsFiat: number;
  projectedAmount: number;
  currency: string;
  privacyMode: boolean;
  isLoading: boolean;
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
            isHidden={privacyMode}
            length={SensitiveTextLength.Short}
            testID={EARN_SECTION_LIST_TEST_IDS.MONEY_PROJECTION_PROJECTED}
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

const EarnSectionListView = () => {
  const navigation = useNavigation<AppNavigationProp>();
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
  const { navigateToEarnOpportunity } = useEarnOpportunityNavigation({
    tokenDetailsSource: TokenDetailsSource.ExploreEarn,
  });
  const { initiateDeposit } = useMoneyAccountDeposit();
  const retryInFlightRef = useRef(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
    (item: EarnAssetSearchItem) => {
      navigateToEarnOpportunity(item.asset);
    },
    [navigateToEarnOpportunity],
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

  const handleViewAllMoney = useCallback(() => {
    navigation.navigate(Routes.MONEY.POTENTIAL_EARNINGS as never);
  }, [navigation]);

  const handleRetry = useCallback(async () => {
    if (retryInFlightRef.current) {
      return;
    }

    retryInFlightRef.current = true;
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
  }, [refresh, refetchMoneyAccountBalance]);

  const renderItem: ListRenderItem<EarnAssetSearchItem> = useCallback(
    ({ item }) => (
      <EarnSearchAssetRow
        item={item}
        onPress={handleItemPress}
        privacyMode={privacyMode}
      />
    ),
    [handleItemPress, privacyMode],
  );

  const keyExtractor = useCallback((item: EarnAssetSearchItem) => item.id, []);

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

    const visibleMoneyAssets = isLoading ? [] : moneyAssets.slice(0, 5);

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
        />
        <EarnMoneyAccountRow
          item={moneyAccountItem}
          onPress={() => navigateToMoneyHome({ pop: false })}
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
            onCardPress={() => handleDeposit(token)}
            onButtonPress={() => handleDeposit(token)}
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
        {!isLoading && (
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
    handleRetry,
    handleDeposit,
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
    navigateToMoneyHome,
    privacyMode,
    projectedAmount,
    totalAssetsFiat,
  ]);

  const listEmptyComponent = useMemo(
    () =>
      isMoneyAccountVisible ? null : isLoading ? (
        <EarnSectionListSkeleton />
      ) : (
        <Box testID={EARN_SECTION_LIST_TEST_IDS.EMPTY} twClassName="flex-1">
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
