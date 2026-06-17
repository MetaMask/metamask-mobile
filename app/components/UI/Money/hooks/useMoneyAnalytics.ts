import { useCallback } from 'react';
import BigNumber from 'bignumber.js';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import useMoneyAccountCardLinkage from '../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../hooks/useMoneyAccountBalance';
import {
  MONEY_BUTTON_TYPES,
  MONEY_SURFACE_TYPES,
} from '../constants/moneyEvents';
import {
  MoneyLocationEventProperties,
  MoneyBaseEventProperties,
  MoneyRedirectEventProperties,
  MoneyOnboardingEventProperties,
  MoneyTooltipClickedEventProperties,
  MoneySurfaceClickedEventProperties,
  MoneyButtonClickedEventProperties,
  MoneyButtonClickedInputProperties,
  MoneyTokenRowButtonClickedInputProperties,
  MoneyTokenSurfaceClickedEventProperties,
  MoneyActivitySurfaceClickedEventProperties,
} from '../types/moneyEvents.types';
import { resolveRedirectTargetType } from '../utils/moneyRedirectTarget';
import { resolveTrackingLabel } from '../utils/moneyTrackingLabel';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { MonetizedPrimitive } from '../../../../core/Analytics/MetaMetrics.types';
import {
  getMMPayChainIds,
  isMoneyDepositTx,
  isMoneyWithdrawTx,
} from '../utils/moneyTransactionGuards';
import { TransactionType } from '@metamask/transaction-controller';
import { snakeCase } from 'lodash';

/**
 * Derives `redirect_target_type` from `redirect_target` so callers only state
 * the target once and the two can never contradict. No-op when no target is
 * present (e.g. tooltip clicks).
 */
const withRedirectType = <
  T extends {
    redirect_target?: MoneyRedirectEventProperties['redirect_target'];
  },
>(
  props: T,
) =>
  props.redirect_target
    ? {
        ...props,
        redirect_target_type: resolveRedirectTargetType(props.redirect_target),
      }
    : props;

/**
 * Derives the tracking label pair (`label_en` + `label_localized`) from a single
 * `label_key` so callers state the key once and the two copies can never
 * contradict. No-op when no key is present (e.g. icon buttons, or callers that
 * supply dynamically computed labels directly).
 */
const withLabel = (
  props: MoneyButtonClickedInputProperties,
): MoneyButtonClickedEventProperties => {
  if (
    props.button_type === MONEY_BUTTON_TYPES.TEXT &&
    'label_key' in props &&
    props.label_key
  ) {
    const { label_key, ...rest } = props;
    return {
      ...rest,
      ...resolveTrackingLabel(label_key),
    } as MoneyButtonClickedEventProperties;
  }
  return props as MoneyButtonClickedEventProperties;
};

export const useMoneyAnalytics = ({
  screen_name,
  bottom_sheet_name,
  component_name,
}: Partial<MoneyLocationEventProperties> = {}) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isCardLinkedToMoneyAccount, isCardAuthenticated } =
    useMoneyAccountCardLinkage();

  const { totalFiatRaw, isBalanceFetching } = useMoneyAccountBalance();

  const getBaseProperties = useCallback((): MoneyBaseEventProperties => {
    // react-query v4 keeps disabled queries (no money account) at status: 'loading'
    // forever, so isLoading would falsely flag empty-state users as "loading" permanently.
    // isBalanceFetching + no settled value = a genuine in-flight first fetch.
    const isMoneyBalanceLoading =
      isBalanceFetching && totalFiatRaw === undefined;

    return {
      ...(screen_name ? { screen_name } : {}),
      ...(component_name ? { component_name } : {}),
      ...(bottom_sheet_name ? { bottom_sheet_name } : {}),
      is_card_linked_to_money_account: isCardLinkedToMoneyAccount,
      /**
       * Note from Card team:
       * selectIsCardholder can still be false even when the user is authenticated.
       * In this case, "cardholder" is determined through on-chain verification against the currently selected SRP.
       * The SRP is not linked to a card, so selectIsCardholder returns false.
       * We should be checking selectIsCardAuthenticated instead.
       */
      is_card_holder: isCardAuthenticated,
      is_money_balance_loading: isMoneyBalanceLoading,
      is_account_funded: isMoneyBalanceLoading
        ? null
        : new BigNumber(totalFiatRaw ?? '0').gt(0),
    };
  }, [
    component_name,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
    isBalanceFetching,
    screen_name,
    bottom_sheet_name,
    totalFiatRaw,
  ]);

  /**
   * Used to track when a button is clicked.
   */
  const trackButtonClicked = useCallback(
    (properties: MoneyButtonClickedInputProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_BUTTON_CLICKED)
          .addProperties({
            ...getBaseProperties(),
            ...withRedirectType(withLabel(properties)),
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  const trackTokenButtonClicked = useCallback(
    (properties: MoneyTokenRowButtonClickedInputProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_BUTTON_CLICKED)
          .addProperties({
            ...getBaseProperties(),
            ...withRedirectType(withLabel(properties)),
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  /**
   * Used to track when a surface is clicked that isn't a button (e.g. View)
   */
  const trackSurfaceClicked = useCallback(
    (properties: MoneySurfaceClickedEventProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_SURFACE_CLICKED)
          .addProperties({
            ...getBaseProperties(),
            ...withRedirectType(properties),
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  const trackTokenSurfaceClicked = useCallback(
    (properties: MoneyTokenSurfaceClickedEventProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_SURFACE_CLICKED)
          .addProperties({
            ...getBaseProperties(),
            ...withRedirectType(properties),
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  const trackActivitySurfaceClicked = useCallback(
    (properties: MoneyActivitySurfaceClickedEventProperties) => {
      const { transaction, ...rest } = properties;
      const { sourceChainId, destinationChainId } =
        getMMPayChainIds(transaction);

      const nestedTxType = isMoneyDepositTx(transaction)
        ? TransactionType.moneyAccountDeposit
        : isMoneyWithdrawTx(transaction)
          ? TransactionType.moneyAccountWithdraw
          : transaction.type;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_SURFACE_CLICKED)
          .addProperties({
            ...getBaseProperties(),
            ...withRedirectType(rest),
            transaction_type: snakeCase(nestedTxType),
            transaction_status: transaction.status,
            chain_id_source: sourceChainId,
            chain_id_destination: destinationChainId,
            monetized_primitive: MonetizedPrimitive.MoneyAccount,
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  const trackTooltipClicked = useCallback(
    (properties: MoneyTooltipClickedEventProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_TOOLTIP_CLICKED)
          .addProperties({
            ...getBaseProperties(),
            ...properties,
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  const trackSurfaceViewed = useCallback(
    (surfaceType: MONEY_SURFACE_TYPES) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_SURFACE_VIEWED)
          .addProperties({
            ...getBaseProperties(),
            surface_type: surfaceType,
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  const trackScreenViewed = useCallback(
    () => trackSurfaceViewed(MONEY_SURFACE_TYPES.SCREEN),
    [trackSurfaceViewed],
  );

  /** For components that exist within a screen */
  const trackComponentViewed = useCallback(
    () => trackSurfaceViewed(MONEY_SURFACE_TYPES.COMPONENT),
    [trackSurfaceViewed],
  );

  const trackBottomSheetViewed = useCallback(
    () => trackSurfaceViewed(MONEY_SURFACE_TYPES.BOTTOM_SHEET),
    [trackSurfaceViewed],
  );

  const trackOnboardingEvent = useCallback(
    (properties: MoneyOnboardingEventProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_ONBOARDING_EVENT)
          .addProperties({
            ...getBaseProperties(),
            ...withRedirectType(properties),
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  return {
    // Click events
    trackButtonClicked,
    trackSurfaceClicked,
    trackTooltipClicked,
    trackTokenButtonClicked,
    trackTokenSurfaceClicked,
    trackActivitySurfaceClicked,

    // View events
    trackScreenViewed,
    trackBottomSheetViewed,
    trackComponentViewed,

    // Onboarding events
    trackOnboardingEvent,
  };
};
