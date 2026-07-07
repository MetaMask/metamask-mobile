import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import {
  Box,
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import MoneyHeader from '../../components/MoneyHeader';
import MoneyBalanceSummary from '../../components/MoneyBalanceSummary';
import MoneyActionButtonRow from '../../components/MoneyActionButtonRow';
import MoneyEarnings from '../../components/MoneyEarnings';
import MoneyMusdTokenRow from '../../components/MoneyMusdTokenRow';
import MoneyOnboardingCard from '../../components/MoneyOnboardingCard';
import MoneyCondensedInfoCards from '../../components/MoneyCondensedInfoCards';
import MoneyHowItWorks from '../../components/MoneyHowItWorks';
import MoneyPotentialEarnings from '../../components/MoneyPotentialEarnings';
import MoneyMetaMaskCard from '../../components/MoneyMetaMaskCard';
import MoneyWhatYouGet from '../../components/MoneyWhatYouGet';
import MoneyActivityList, {
  MAX_PREVIEW_ITEMS as MONEY_HOME_ACTIVITY_PREVIEW_COUNT,
} from '../../components/MoneyActivityList';
import MoneyFooter from '../../components/MoneyFooter';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneyHomeViewTestIds } from './MoneyHomeView.testIds';
import styleSheet from './MoneyHomeView.styles';
import { useMoneyEarnableTokens } from '../../hooks/useMoneyEarnableTokens';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { useMoneyActivityItems } from '../../hooks/useMoneyActivityItems';
import { MoneyActivityFilter } from '../../constants/mockActivityData';
import { deriveMoneyMetaMaskCardMode } from '../../utils/moneyMetaMaskCardMode';
import { openInAppBrowser } from '../../utils/openInAppBrowser';
import MoneyActivityLoading from '../../components/MoneyActivityLoading/MoneyActivityLoading';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../hooks/useMoneyAccountInfo';
import { moneyFormatUsd, DUST_THRESHOLD } from '../../utils/moneyFormatFiat';
import { calculateProjectedEarnings } from '../../utils/projections';
import AppConstants from '../../../../../core/AppConstants';
import {
  selectCardHomeDataStatus,
  selectHasMetalCard,
  selectIsCardholder,
} from '../../../../../selectors/cardController';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../selectors/featureFlags';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { useCardHomeData } from '../../../Card/hooks/useCardHomeData';
import { MONEY_HOME_CARD_ORIGIN } from '../../../Card/hooks/useCardPostAuthRedirect';
import Logger from '../../../../../util/Logger';
import { useTheme } from '../../../../../util/theme';
import { MoneyBalanceDisplayState } from '../../types';
import { Hex } from '@metamask/utils';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardFlow,
  CardScreens,
  deriveCardState,
} from '../../../Card/util/metrics';

import { TraceName } from '../../../../../util/trace';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  useMoneyHomePerformance,
  type MoneyHomeSegment,
} from '../../hooks/useMoneyHomePerformance';
import useMountEffect from '../../hooks/useMountEffect';
import {
  COMPONENT_NAMES,
  MONEY_TOOLTIP_NAMES,
  MONEY_TOOLTIP_TYPES,
  SCREEN_NAMES,
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_URLS,
  MONEY_BUTTON_TYPES,
} from '../../constants/moneyEvents';
import { TransactionMeta } from '@metamask/transaction-controller';
import useRefreshMusdFiatRate from '../../hooks/useRefreshMusdFiatRate';

const Divider = () => <Box twClassName="h-px bg-border-muted my-7" />;

const ACTION_BUTTON_ROW_BUTTON_COUNT = 3;

const MoneyHomeView = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedCardActionRowViewRef = useRef(false);

  const {
    trackButtonClicked,
    trackTooltipClicked,
    trackSurfaceClicked,
    trackTokenButtonClicked,
    trackTokenSurfaceClicked,
    trackActivitySurfaceClicked,
    trackScreenViewed,
  } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
  });

  const {
    totalFiatFormatted,
    totalFiatRaw,
    vaultApyQuery,
    isBalanceLoading,
    lastKnownTotalFiatFormatted,
    refetchBalance,
    apyPercent,
    apyDecimal,
  } = useMoneyAccountBalance();

  const refreshMusdFiatRate = useRefreshMusdFiatRate();

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  useMountEffect(trackScreenViewed);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchBalance(), refreshMusdFiatRate()]);
    } catch (error) {
      Logger.error(error as Error, '[MoneyHomeView] Pull-to-refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [refetchBalance, refreshMusdFiatRate]);

  const { hasMoneyAccount } = useMoneyAccountInfo();
  // mUSD is USD-pegged 1:1, so show the token balance as dollars — consistent
  // with the account balance and projected earnings above, which also use USD.
  const { tokenBalanceAggregated: musdTokenBalanceAggregated } =
    useMusdBalance();
  const musdFiatFormatted = useMemo(
    () => moneyFormatUsd(new BigNumber(musdTokenBalanceAggregated)),
    [musdTokenBalanceAggregated],
  );

  const { tokens: depositTokens, isNoFeeToken } = useMoneyEarnableTokens();
  const { initiateDeposit } = useMoneyAccountDeposit();
  // Share the single merge/bucket path with the full activity view so the home
  // preview and that view never diverge (notably in mock mode). The home
  // preview shows the "All" bucket; `isLoading` is already mock-aware.
  const {
    buckets,
    hasMore: hasMoreActivity,
    // Still settling while the initial query loads or the auto-fill may yet
    // deliver a first preview row — the hook derives this from the same
    // predicate that drives its fetch loop, so the skeleton can neither
    // vanish mid-fill nor outlive a fill that stopped (budget spent, error).
    isSettling: isActivitySettling,
    error: activityError,
    moneyAddress,
    mockDataEnabled,
  } = useMoneyActivityItems({
    fill: {
      bucket: MoneyActivityFilter.All,
      count: MONEY_HOME_ACTIVITY_PREVIEW_COUNT,
    },
  });
  const activityItems = buckets[MoneyActivityFilter.All];

  const isCardholder = useSelector(selectIsCardholder);
  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);
  const hasMetalCard = useSelector(selectHasMetalCard);
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );
  const isMoneyAccountVisible =
    isMoneyAccountEnabled && isMoneyAccountGeoEligible;
  const {
    startLinkFlow,
    isCardAuthenticated,
    isCardVerified,
    isCardLinkedToMoneyAccount,
    isLinking,
    hasMoneyAccountRequirements,
    hasMoneyAccountBaseRequirements,
    isResidencyBlocked,
  } = useMoneyAccountCardLinkage();

  const metamaskCardMode = deriveMoneyMetaMaskCardMode({
    isCardLinkedToMoneyAccount,
    isCardholder,
    isCardAuthenticated,
    isCardVerified,
    isResidencyBlocked,
    isMoneyAccountVisible,
    hasMoneyAccountBaseRequirements,
    hasMoneyAccountRequirements,
  });

  let displayState: MoneyBalanceDisplayState;
  if (!hasMoneyAccount) {
    displayState = { kind: 'noAccount' };
  } else if (totalFiatFormatted !== undefined) {
    // A fresh balance always wins — the banner is hidden on success.
    displayState = { kind: 'balance', value: totalFiatFormatted };
  } else {
    // No fresh balance (loading, fetch error, or rate not ready). Carry the
    // cached balance (when valid for this account/currency) so it renders as a
    // muted "last known" figure; otherwise the slot shows a dash. Either way a
    // BannerAlert accompanies it.
    displayState = {
      kind: 'unavailable',
      lastKnownValue: lastKnownTotalFiatFormatted,
    };
  }

  const showBalanceUnavailableBanner = displayState.kind === 'unavailable';

  const hasBalanceValue = displayState.kind === 'balance';
  const hasSpendableBalance =
    hasBalanceValue &&
    !!totalFiatRaw &&
    new BigNumber(totalFiatRaw).abs().gte(DUST_THRESHOLD);
  const isFunded = hasSpendableBalance || activityItems.length > 0;
  const isEmptyState = hasBalanceValue && !isFunded;

  // Report time-to-content separately for the balance and the activity list, so
  // their load times can be compared, plus a combined "fully usable" span.
  const balanceReady = !isBalanceLoading;
  // Only ready once the preview is no longer settling, so the time-to-content
  // trace can't close before auto-fill rows are actually on screen. A failed
  // fetch ends the span as a failure rather than a (fast) success.
  const activityReady = !isActivitySettling;
  // Each segment carries its own content_state so it is sampled from data
  // that segment has actually settled — the combined span may only read
  // `isFunded` because it waits for both. Rebuilt every render; the hook ends
  // each span at most once, so no memoisation is needed.
  const moneyHomePerformanceSegments: MoneyHomeSegment[] = [
    {
      name: TraceName.MoneyHomeBalanceTimeToContent,
      ready: balanceReady,
      contentState: hasSpendableBalance ? 'filled' : 'empty',
    },
    {
      name: TraceName.MoneyHomeActivityTimeToContent,
      ready: activityReady,
      failed: activityError,
      contentState: activityItems.length > 0 ? 'filled' : 'empty',
    },
    {
      name: TraceName.MoneyHomeTimeToContent,
      ready: balanceReady && activityReady,
      failed: activityError,
      contentState: isFunded ? 'filled' : 'empty',
    },
  ];
  useMoneyHomePerformance({ segments: moneyHomePerformanceSegments });

  const formattedZero = useMemo(() => moneyFormatUsd(new BigNumber(0)), []);

  const monthlyEarnings = useMemo(() => {
    if (!totalFiatRaw || !apyDecimal) return formattedZero;
    const balance = new BigNumber(totalFiatRaw);
    if (balance.isZero() || balance.isNaN()) return formattedZero;
    const earnings = calculateProjectedEarnings(
      balance.toNumber(),
      apyDecimal,
      1 / 12,
    );
    if (!Number.isFinite(earnings)) return formattedZero;
    const formatted = moneyFormatUsd(new BigNumber(earnings));
    return formatted === formattedZero ? formatted : `+${formatted}`;
  }, [totalFiatRaw, apyDecimal, formattedZero]);

  const yearlyEarnings = useMemo(() => {
    if (!totalFiatRaw || !apyDecimal) return formattedZero;
    const balance = new BigNumber(totalFiatRaw);
    if (balance.isZero() || balance.isNaN()) return formattedZero;
    const earnings = calculateProjectedEarnings(
      balance.toNumber(),
      apyDecimal,
      1,
    );
    if (!Number.isFinite(earnings)) return formattedZero;
    const formatted = moneyFormatUsd(new BigNumber(earnings));
    return formatted === formattedZero ? formatted : `+${formatted}`;
  }, [totalFiatRaw, apyDecimal, formattedZero]);

  const handleMenuPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.ICON,
      button_intent: MONEY_BUTTON_INTENTS.OPEN_MORE_MENU,
      component_name: COMPONENT_NAMES.MONEY_MORE,
      redirect_target: BOTTOM_SHEET_NAMES.MONEY_MORE_SHEET,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MORE_SHEET,
    });
  }, [navigation, trackButtonClicked]);

  const handleAddPress = useCallback(
    ({
      labelKey,
      componentName,
      buttonPosition,
      buttonRowButtonCount,
    }: {
      labelKey: string;
      componentName: COMPONENT_NAMES;
      buttonPosition?: number;
      buttonRowButtonCount?: number;
    }) => {
      trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
        label_key: labelKey,
        component_name: componentName,
        redirect_target: BOTTOM_SHEET_NAMES.MONEY_ADD_MONEY_SHEET,
        ...(buttonPosition && { button_position: buttonPosition }),
        ...(buttonRowButtonCount && {
          button_row_button_count: buttonRowButtonCount,
        }),
      });

      navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
      });
    },
    [navigation, trackButtonClicked],
  );

  const handleFooterAddMoneyPress = useCallback(() => {
    handleAddPress({
      labelKey: 'money.footer.add_money',
      componentName: COMPONENT_NAMES.MONEY_FOOTER,
    });
  }, [handleAddPress]);

  const handleMusdRowAddPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_key: 'money.musd_row.add',
      component_name: COMPONENT_NAMES.MONEY_MUSD_TOKEN_SECTION,
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });

    initiateDeposit().catch((error) =>
      Logger.error(error as Error, {
        message: '[MoneyHomeView] Failed to initiate deposit from mUSD row',
      }),
    );
  }, [initiateDeposit, trackButtonClicked]);

  const handleTransferPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.TRANSFER_MONEY,
      label_key: 'money.action.transfer',
      redirect_target: BOTTOM_SHEET_NAMES.MONEY_TRANSFER_MONEY_SHEET,
      component_name: COMPONENT_NAMES.MONEY_ACTION_BUTTON_ROW,
      button_position: 2,
      button_row_button_count: ACTION_BUTTON_ROW_BUTTON_COUNT,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.TRANSFER_MONEY_SHEET,
    });
  }, [navigation, trackButtonClicked]);

  const navigateToCardHome = useCallback(() => {
    const isUpsell = metamaskCardMode === 'upsell';

    navigation.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: { postAuthRedirect: MONEY_HOME_CARD_ORIGIN },
      ...(isUpsell ? { animation: 'slide_from_bottom' } : {}),
    });
  }, [navigation, metamaskCardMode]);

  const handleCardHeaderPress = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_CARD_SECTION_HEADER,
      redirect_target: SCREEN_NAMES.CARD_HOME,
    });

    navigateToCardHome();
  }, [navigateToCardHome, trackSurfaceClicked]);

  const handleActionButtonCardPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.CARD_HOME,
      label_key: 'money.action.card',
      component_name: COMPONENT_NAMES.MONEY_ACTION_BUTTON_ROW,
      redirect_target: SCREEN_NAMES.CARD_HOME,
      button_position: 3,
      button_row_button_count: ACTION_BUTTON_ROW_BUTTON_COUNT,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          screen: CardScreens.MONEY_HOME,
          entrypoint: CardEntryPoint.MONEY_HOME_ACTION_ROW,
          action: CardActions.MONEY_ACCOUNT_CARD_ACTION_ROW_BUTTON,
        })
        .build(),
    );

    navigateToCardHome();
  }, [trackButtonClicked, trackEvent, createEventBuilder, navigateToCardHome]);

  const handleLinkCardPress = useCallback(() => {
    startLinkFlow({
      ...MONEY_HOME_CARD_ORIGIN,
      entrypoint: CardEntryPoint.MONEY_HOME_METAMASK_CARD,
    });
  }, [startLinkFlow]);

  useEffect(() => {
    if (hasTrackedCardActionRowViewRef.current) return;
    hasTrackedCardActionRowViewRef.current = true;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.MONEY_HOME,
          entrypoint: CardEntryPoint.MONEY_HOME_ACTION_ROW,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleApyInfoPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.APY,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
      component_name: COMPONENT_NAMES.MONEY_BALANCE_SUMMARY,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: apyPercent },
    });
  }, [trackTooltipClicked, navigation, apyPercent]);

  const handleEarningsInfoPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.ESTIMATED_EARNINGS,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
      component_name: COMPONENT_NAMES.MONEY_ESTIMATED_EARNINGS_SECTION,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARNINGS_INFO_SHEET,
    });
  }, [navigation, trackTooltipClicked]);

  const handleEarnCryptoInfoPress = useCallback(() => {
    trackTooltipClicked({
      tooltip_name: MONEY_TOOLTIP_NAMES.EARN_ON_YOUR_CRYPTO,
      tooltip_type: MONEY_TOOLTIP_TYPES.INFO,
    });

    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.EARN_CRYPTO_INFO_SHEET,
    });
  }, [navigation, trackTooltipClicked]);

  const handleMusdRowPress = useCallback(
    ({ componentName }: { componentName: COMPONENT_NAMES }) => {
      trackSurfaceClicked({
        component_name: componentName,
        redirect_target: MONEY_URLS.MUSD_PRICE,
      });

      Linking.openURL(AppConstants.URLS.MUSD_PRICE).catch((error: Error) => {
        Logger.error(error, '[MoneyHomeView] Failed to open mUSD price page');
      });
    },
    [trackSurfaceClicked],
  );

  const handleTokenButtonPress = useCallback(
    async (token: AssetType, tokenIndex: number, tokenCount: number) => {
      try {
        trackTokenButtonClicked({
          button_type: MONEY_BUTTON_TYPES.TEXT,
          button_intent: MONEY_BUTTON_INTENTS.ADD_MONEY,
          component_name:
            COMPONENT_NAMES.MONEY_POTENTIAL_EARNINGS_SECTION_TOKEN_ROW,
          label_key: 'money.potential_earnings.add',
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
          token_symbol: token.symbol,
          token_position_in_list: tokenIndex + 1,
          token_chain_id: token.chainId ?? '',
          tokens_in_list: tokenCount,
        });

        await initiateDeposit({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
        });
      } catch (error) {
        Logger.error(error as Error, {
          message:
            '[MoneyHomeView] Failed to initiate deposit from potential earnings',
        });
      }
    },
    [initiateDeposit, trackTokenButtonClicked],
  );

  const handleTokenCardPress = useCallback(
    async (token: AssetType, tokenIndex: number, tokenCount: number) => {
      try {
        trackTokenSurfaceClicked({
          component_name:
            COMPONENT_NAMES.MONEY_POTENTIAL_EARNINGS_SECTION_TOKEN_ROW,
          redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
          token_symbol: token.symbol,
          token_position_in_list: tokenIndex + 1,
          token_chain_id: token.chainId ?? '',
          tokens_in_list: tokenCount,
        });

        await initiateDeposit({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
        });
      } catch (error) {
        Logger.error(error as Error, {
          message:
            '[MoneyHomeView] Failed to initiate deposit from potential earnings',
        });
      }
    },
    [initiateDeposit, trackTokenSurfaceClicked],
  );

  const handlePotentialEarningsHeaderPress = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_POTENTIAL_EARNINGS_SECTION_HEADER,
      redirect_target: SCREEN_NAMES.MONEY_POTENTIAL_EARNINGS,
    });

    navigation.navigate(Routes.MONEY.POTENTIAL_EARNINGS as never);
  }, [navigation, trackSurfaceClicked]);

  const handleMoneyPotentialEarningsViewAllPressed = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.VIEW_ALL,
      component_name: COMPONENT_NAMES.MONEY_POTENTIAL_EARNINGS_SECTION,
      label_key: 'money.potential_earnings.view_all',
      redirect_target: SCREEN_NAMES.MONEY_POTENTIAL_EARNINGS,
    });

    navigation.navigate(Routes.MONEY.POTENTIAL_EARNINGS as never);
  }, [navigation, trackButtonClicked]);

  const handleWhatYouGetPress = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_CONDENSED_INFO_CARDS_WHAT_YOU_GET,
      redirect_target: MONEY_URLS.MONEY_LANDING,
    });

    openInAppBrowser(navigation, AppConstants.URLS.MONEY_LANDING);
  }, [navigation, trackSurfaceClicked]);

  const handleLearnMorePress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.LEARN_MORE,
      component_name: COMPONENT_NAMES.MONEY_WHAT_YOU_GET_SECTION,
      label_key: 'money.what_you_get.learn_more',
      redirect_target: MONEY_URLS.MONEY_LANDING,
    });

    openInAppBrowser(navigation, AppConstants.URLS.MONEY_LANDING);
  }, [navigation, trackButtonClicked]);

  const handleHowItWorksPress = useCallback(
    ({ componentName }: { componentName: COMPONENT_NAMES }) => {
      trackSurfaceClicked({
        component_name: componentName,
        redirect_target: SCREEN_NAMES.MONEY_HOW_IT_WORKS,
      });

      navigation.navigate(Routes.MONEY.HOW_IT_WORKS as never);
    },
    [navigation, trackSurfaceClicked],
  );

  const handleActivityHeaderPress = useCallback(() => {
    trackSurfaceClicked({
      component_name: COMPONENT_NAMES.MONEY_ACTIVITY_SECTION_HEADER,
      redirect_target: SCREEN_NAMES.MONEY_ACTIVITY,
    });

    navigation.navigate(Routes.MONEY.ACTIVITY as never);
  }, [navigation, trackSurfaceClicked]);

  const handleViewAllActivityPress = useCallback(() => {
    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: MONEY_BUTTON_INTENTS.VIEW_ALL,
      component_name: COMPONENT_NAMES.MONEY_ACTIVITY_SECTION,
      label_key: 'money.activity.view_all',
      redirect_target: SCREEN_NAMES.MONEY_ACTIVITY,
    });

    navigation.navigate(Routes.MONEY.ACTIVITY as never);
  }, [navigation, trackButtonClicked]);

  const handleActivityItemPress = useCallback(
    (transaction: TransactionMeta) => {
      trackActivitySurfaceClicked({
        transaction,
        redirect_target: SCREEN_NAMES.MONEY_ACTIVITY_DETAILS,
        component_name: COMPONENT_NAMES.MONEY_ACTIVITY_LIST_ITEM,
      });

      navigation.navigate(Routes.MONEY.TRANSACTION_DETAILS, {
        transactionId: transaction.id,
      });
    },
    [navigation, trackActivitySurfaceClicked],
  );

  const { primaryToken: cardPrimaryToken } = useCardHomeData();
  const cardBalance = cardPrimaryToken?.balanceFiat ?? formattedZero;
  const cardState = deriveCardState({
    isCardholder,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
  });
  const isCardAnalyticsReady =
    cardHomeDataStatus === 'success' || cardHomeDataStatus === 'error';

  const metamaskCardSection = metamaskCardMode
    ? {
        key: 'metamask-card',
        node: (
          <MoneyMetaMaskCard
            mode={metamaskCardMode}
            onGetNowPress={navigateToCardHome}
            onHeaderPress={handleCardHeaderPress}
            onLinkPress={handleLinkCardPress}
            onManagePress={navigateToCardHome}
            showMetalCard={hasMetalCard}
            isLinkDisabled={isLinking}
            cardBalance={cardBalance}
            isBalanceStale={showBalanceUnavailableBanner}
            apy={apyPercent}
            analyticsScreen={CardScreens.MONEY_HOME}
            analyticsEntryPoint={CardEntryPoint.MONEY_HOME_METAMASK_CARD}
            analyticsFlow={CardFlow.MONEY_ACCOUNT_LINKAGE}
            analyticsCardState={cardState}
            analyticsReady={isCardAnalyticsReady}
          />
        ),
      }
    : null;

  const shouldShowMetaMaskCardEarly =
    metamaskCardMode !== null && metamaskCardMode !== 'upsell';

  const contentSections: { key: string; node: React.ReactNode }[] = [];

  if (hasBalanceValue && isFunded) {
    contentSections.push({
      key: 'earnings',
      node: (
        <MoneyEarnings
          monthlyEarnings={monthlyEarnings}
          yearlyEarnings={yearlyEarnings}
          isLoading={vaultApyQuery.isLoading || isBalanceLoading}
          onInfoPress={handleEarningsInfoPress}
        />
      ),
    });
  }

  if (isEmptyState) {
    contentSections.push({
      key: 'how-it-works',
      node: (
        <>
          <MoneyHowItWorks
            apy={apyPercent}
            onHeaderPress={() =>
              handleHowItWorksPress({
                componentName:
                  COMPONENT_NAMES.MONEY_HOW_IT_WORKS_SECTION_HEADER,
              })
            }
            isLoading={vaultApyQuery.isLoading}
          />
          <MoneyMusdTokenRow
            onPress={() =>
              handleMusdRowPress({
                componentName: COMPONENT_NAMES.MONEY_MUSD_TOKEN_SECTION,
              })
            }
            onAddPress={handleMusdRowAddPress}
            balance={musdFiatFormatted}
          />
        </>
      ),
    });
  }

  if (shouldShowMetaMaskCardEarly && metamaskCardSection) {
    contentSections.push(metamaskCardSection);
  }

  if (isActivitySettling || activityItems.length >= 1) {
    contentSections.push({
      key: 'activity',
      node: isActivitySettling ? (
        <MoneyActivityLoading />
      ) : (
        <MoneyActivityList
          items={activityItems}
          moneyAddress={moneyAddress}
          hasMore={hasMoreActivity}
          onViewAllPress={handleViewAllActivityPress}
          onHeaderPress={handleActivityHeaderPress}
          onItemPress={mockDataEnabled ? undefined : handleActivityItemPress}
        />
      ),
    });
  }

  if (depositTokens.length > 0) {
    contentSections.push({
      key: 'potential-earnings',
      node: (
        <MoneyPotentialEarnings
          tokens={depositTokens}
          apyDecimal={apyDecimal}
          isNoFeeToken={isNoFeeToken}
          onTokenCardPress={handleTokenCardPress}
          onTokenButtonPress={handleTokenButtonPress}
          onViewAllPress={handleMoneyPotentialEarningsViewAllPressed}
          onHeaderPress={handlePotentialEarningsHeaderPress}
          onInfoPress={handleEarnCryptoInfoPress}
        />
      ),
    });
  }

  if (!shouldShowMetaMaskCardEarly && metamaskCardSection) {
    contentSections.push(metamaskCardSection);
  }

  if (isFunded) {
    contentSections.push({
      key: 'condensed-info',
      node: (
        <MoneyCondensedInfoCards
          onHowItWorksPress={() =>
            handleHowItWorksPress({
              componentName:
                COMPONENT_NAMES.MONEY_CONDENSED_INFO_CARDS_HOW_IT_WORKS,
            })
          }
          onMusdPress={() =>
            handleMusdRowPress({
              componentName: COMPONENT_NAMES.MONEY_CONDENSED_INFO_CARDS_MUSD,
            })
          }
          onWhatYouGetPress={handleWhatYouGetPress}
        />
      ),
    });
  }

  if (isEmptyState) {
    contentSections.push({
      key: 'what-you-get',
      node: (
        <MoneyWhatYouGet
          apy={apyPercent}
          onLearnMorePress={handleLearnMorePress}
        />
      ),
    });
  }

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="flex-1 bg-default"
      testID={MoneyHomeViewTestIds.CONTAINER}
    >
      <MoneyHeader onMenuPress={handleMenuPress} />
      <ScrollView
        testID={MoneyHomeViewTestIds.SCROLL_VIEW}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={colors.icon.default}
            colors={[colors.primary.default]}
          />
        }
      >
        {showBalanceUnavailableBanner && (
          <Box twClassName="px-4 pt-2">
            <BannerAlert
              severity={BannerAlertSeverity.Warning}
              title={strings('money.balance_unavailable')}
              description={strings(
                'money.balance_unavailable_banner_description',
              )}
              style={styles.balanceUnavailableBanner}
              testID={MoneyHomeViewTestIds.BALANCE_UNAVAILABLE_BANNER}
            />
          </Box>
        )}
        <MoneyBalanceSummary
          apy={apyPercent}
          displayState={displayState}
          onApyInfoPress={handleApyInfoPress}
        />
        <MoneyActionButtonRow
          add={{
            onPress: () =>
              handleAddPress({
                labelKey: 'money.action.add',
                componentName: COMPONENT_NAMES.MONEY_ACTION_BUTTON_ROW,
                buttonPosition: 1,
                buttonRowButtonCount: ACTION_BUTTON_ROW_BUTTON_COUNT,
              }),
          }}
          transfer={{
            onPress: handleTransferPress,
            disabled: !hasSpendableBalance,
          }}
          card={{ onPress: handleActionButtonCardPress }}
        />
        <MoneyOnboardingCard />
        {contentSections.map((section, index) => (
          <React.Fragment key={section.key}>
            {index > 0 && <Divider />}
            {section.node}
          </React.Fragment>
        ))}
        <MoneyFooter onAddMoneyPress={handleFooterAddMoneyPress} />
      </ScrollView>
    </Box>
  );
};

export default MoneyHomeView;
