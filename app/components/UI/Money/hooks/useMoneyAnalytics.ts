import { useCallback } from 'react';
import BigNumber from 'bignumber.js';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import useMoneyAccountCardLinkage from '../../Card/hooks/useMoneyAccountCardLinkage';
import useMoneyAccountBalance from '../hooks/useMoneyAccountBalance';
import {
  MoneyLocationEventProperties,
  MoneyBaseEventProperties,
  MoneyButtonEventProperties,
  MoneyRedirectEventProperties,
  MoneyOnboardingEventProperties,
} from '../constants/moneyEvents';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';

export const useMoneyAnalytics = ({
  screen_name,
  component_name,
}: Partial<MoneyLocationEventProperties> = {}) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { isCardLinkedToMoneyAccount, isCardholder } =
    useMoneyAccountCardLinkage();

  const { totalFiatRaw } = useMoneyAccountBalance();

  const getBaseProperties = useCallback(
    (): MoneyBaseEventProperties => ({
      ...(screen_name ? { screen_name } : {}),
      ...(component_name ? { component_name } : {}),
      is_card_linked_to_money_account: isCardLinkedToMoneyAccount,
      is_card_holder: isCardholder,
      is_account_funded: new BigNumber(totalFiatRaw ?? '0').gt(0),
    }),
    [
      component_name,
      isCardLinkedToMoneyAccount,
      isCardholder,
      screen_name,
      totalFiatRaw,
    ],
  );

  /**
   * Used to track when a button is clicked.
   */
  const trackButtonClicked = useCallback(
    (properties: MoneyButtonEventProperties) => {
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
   * Used to track when a surface is clicked that isn't a button (e.g. MoneyBalanceCard)
   */
  const trackSurfaceClicked = useCallback(
    (properties: MoneyRedirectEventProperties) => {
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

  /**
   * Used to track when a screen or component is viewed.
   */
  const trackSurfaceViewed = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MONEY_SURFACE_VIEWED)
        .addProperties({
          ...getBaseProperties(),
        })
        .build(),
    );
  }, [createEventBuilder, getBaseProperties, trackEvent]);

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
    trackButtonClicked,
    trackSurfaceClicked,
    trackSurfaceViewed,
    trackOnboardingEvent,
  };
};
