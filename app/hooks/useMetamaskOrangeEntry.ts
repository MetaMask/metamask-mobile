import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import { strings } from '../../locales/i18n';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../components/UI/Money/constants/moneyEvents';
import { useMoneyAnalytics } from '../components/UI/Money/hooks/useMoneyAnalytics';
import Routes from '../constants/navigation/Routes';
import type { AppNavigationProp } from '../core/NavigationService/types';
import { useHasProMembership } from './useHasProMembership';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

export interface UseMetamaskOrangeEntryResult {
  /**
   * True when the Pro flow is on. The row stays in the menu while Plus
   * access is still loading so it does not appear after the list is visible.
   */
  showOrangeEntry: boolean;
  /** Subscriber or join label, already localized. */
  label: string;
  /** Tracks the Accounts Menu Orange click and opens the hub or subscription flow. */
  onPress: () => void;
}

/**
 * Shared MetaMask Orange menu entry for Accounts Menu and the profile drawer.
 *
 * Visibility, copy, analytics, and destination stay identical across both
 * surfaces, including the `accounts_menu` navigation source.
 */
export function useMetamaskOrangeEntry(): UseMetamaskOrangeEntryResult {
  const navigation = useNavigation<AppNavigationProp>();
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const hasMembership = useHasProMembership();
  const { trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.ACCOUNTS_MENU,
  });
  // Present as soon as the Pro flow is on. The label updates in place once
  // membership status is known.
  const showOrangeEntry = isProSubscriptionEnabled;
  const labelKey = hasMembership
    ? 'accounts_menu.metamask_orange'
    : 'accounts_menu.join_metamask_orange';

  const onPress = useCallback(() => {
    // Every Plus status except canceled opens the hub. Canceled, no
    // subscription, and a still-loading membership open Benefits.
    const destination = hasMembership
      ? {
          button_intent: MONEY_BUTTON_INTENTS.OPEN_PRO_HUB,
          redirect_target: SCREEN_NAMES.PRO_HUB,
          route: Routes.PRO_HUB.ROOT,
        }
      : {
          button_intent: MONEY_BUTTON_INTENTS.GET_PRO,
          redirect_target: SCREEN_NAMES.PRO_SUBSCRIPTION,
          route: Routes.PRO_SUBSCRIPTION.ROOT,
        };

    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      component_name: COMPONENT_NAMES.ACCOUNTS_MENU_ORANGE,
      button_intent: destination.button_intent,
      label_key: labelKey,
      redirect_target: destination.redirect_target,
    });

    navigation.navigate(destination.route, {
      source: 'accounts_menu',
    });
  }, [hasMembership, labelKey, navigation, trackButtonClicked]);

  return {
    showOrangeEntry,
    label: strings(labelKey),
    onPress,
  };
}
