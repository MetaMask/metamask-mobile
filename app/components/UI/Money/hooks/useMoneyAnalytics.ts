import { useCallback } from 'react';
import BigNumber from 'bignumber.js';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import useMoneyAccountCardLinkage from '../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../hooks/useMoneyAccountBalance';
import {
  MoneyLocationEventProperties,
  MoneyBaseEventProperties,
  MoneyTextButtonEventProperties,
  MoneyRedirectEventProperties,
  MoneyOnboardingEventProperties,
  MoneyTooltipEventProperties,
  MONEY_SURFACE_TYPES,
  MoneySurfaceClickedEventProperties,
  MoneyButtonClickedEventProperties,
  MoneyTokenRowButtonClickedEventProperties,
  MoneyTokenSurfaceClickedEventProperties,
  MoneyActivitySurfaceClickedEventProperties,
} from '../constants/moneyEvents';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { MonetizedPrimitive } from '../../../../core/Analytics/MetaMetrics.types';
import {
  getMMPayChainIds,
  isMoneyDepositTx,
  isMoneyWithdrawTx,
} from '../utils/moneyTransactionGuards';
import { TransactionType } from '@metamask/transaction-controller';
import { snakeCase } from 'lodash';

export const useMoneyAnalytics = ({
  screen_name,
  bottom_sheet_name,
  component_name,
}: Partial<MoneyLocationEventProperties> = {}) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isCardLinkedToMoneyAccount, isCardAuthenticated } =
    useMoneyAccountCardLinkage();

  const { totalFiatRaw } = useMoneyAccountBalance();

  const getBaseProperties = useCallback(
    (): MoneyBaseEventProperties => ({
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
      is_account_funded: new BigNumber(totalFiatRaw ?? '0').gt(0),
    }),
    [
      component_name,
      isCardAuthenticated,
      isCardLinkedToMoneyAccount,
      screen_name,
      bottom_sheet_name,
      totalFiatRaw,
    ],
  );

  /**
   * Used to track when a button is clicked.
   */
  const trackButtonClicked = useCallback(
    (properties: MoneyButtonClickedEventProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_BUTTON_CLICKED)
          .addProperties({
            ...getBaseProperties(),
            ...properties,
          })
          .build(),
      );
    },
    [createEventBuilder, getBaseProperties, trackEvent],
  );

  const trackTokenButtonClicked = useCallback(
    (properties: MoneyTokenRowButtonClickedEventProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_BUTTON_CLICKED)
          .addProperties({
            ...getBaseProperties(),
            ...properties,
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
            ...properties,
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
            ...properties,
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
            ...rest,
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
    (properties: MoneyTooltipEventProperties) => {
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

  const trackSurfaceViewed = (surfaceType: MONEY_SURFACE_TYPES) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MONEY_SURFACE_VIEWED)
        .addProperties({
          ...getBaseProperties(),
          surface_type: surfaceType,
        })
        .build(),
    );
  };

  const trackScreenViewed = () =>
    trackSurfaceViewed(MONEY_SURFACE_TYPES.SCREEN);

  /** For components that exist within a screen */
  const trackComponentViewed = () =>
    trackSurfaceViewed(MONEY_SURFACE_TYPES.COMPONENT);

  const trackBottomSheetViewed = () =>
    trackSurfaceViewed(MONEY_SURFACE_TYPES.BOTTOM_SHEET);

  const trackOnboardingEvent = useCallback(
    (properties: MoneyOnboardingEventProperties) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.MONEY_ONBOARDING_EVENT)
          .addProperties({
            ...getBaseProperties(),
            ...properties,
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
