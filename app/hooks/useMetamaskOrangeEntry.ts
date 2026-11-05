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
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccessState,
} from './useMoneyAccountPlusAccess';
import { useHasProMembership } from './useHasProMembership';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

export interface UseMetamaskOrangeEntryResult {
  /**
   * True when the Pro flow is on. The row stays in the menu while the label
   * is still resolving so it does not pop in later.
   */
  showOrangeEntry: boolean;
  /**
   * True while the Pro flow is on and membership is not known yet. Callers
   * show a skeleton instead of either label.
   */
  isLabelPending: boolean;
  /** Subscriber or join label, already localized. Unused while pending. */
  label: string;
  /** Tracks the Accounts Menu Orange click and opens the hub or subscription flow. */
  onPress: () => void;
}

/**
 * Shared MetaMask Orange menu entry for Accounts Menu and the profile drawer.
 *
 * Visibility, copy, analytics, and destination stay identical across both
 * surfaces, including the `accounts_menu` navigation source.
 *
 * A stored membership shows "MetaMask Orange" and opens Pro Hub. A settled
 * non-member shows "Join MetaMask Orange" and opens Benefits. That includes
 * a leftover entitlement once subscriptions have settled, because Pro Hub
 * leaves immediately unless a membership is stored. While that check is
 * still running and nothing is stored, the row stays put and shows a skeleton.
 */
export function useMetamaskOrangeEntry(): UseMetamaskOrangeEntryResult {
  const navigation = useNavigation<AppNavigationProp>();
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const { access, isSubscriptionsSettled } = useMoneyAccountPlusAccessState();
  const hasMembership = useHasProMembership();
  const { trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.ACCOUNTS_MENU,
  });
  // Opening the menu starts the subscriptions query. A stored plan can label
  // the row on the first paint. Subscriber access also covers a leftover
  // entitlement, including before the list loads, so it is not enough to open
  // the hub. An empty result waits until that query settles, then joins.
  const isMember = hasMembership;
  const isKnownNonMember =
    !isMember &&
    (access === MoneyAccountPlusAccess.Eligible ||
      (access === MoneyAccountPlusAccess.Subscriber && isSubscriptionsSettled));
  const showOrangeEntry = isProSubscriptionEnabled;
  const isLabelPending = showOrangeEntry && !isMember && !isKnownNonMember;
  const labelKey = isKnownNonMember
    ? 'accounts_menu.join_metamask_orange'
    : 'accounts_menu.metamask_orange';

  const onPress = useCallback(() => {
    if (!isMember && !isKnownNonMember) {
      return;
    }

    // Members open the hub. Only a settled non-member opens Benefits.
    const destination = isKnownNonMember
      ? {
          button_intent: MONEY_BUTTON_INTENTS.GET_PRO,
          redirect_target: SCREEN_NAMES.PRO_SUBSCRIPTION,
          route: Routes.PRO_SUBSCRIPTION.ROOT,
        }
      : {
          button_intent: MONEY_BUTTON_INTENTS.OPEN_PRO_HUB,
          redirect_target: SCREEN_NAMES.PRO_HUB,
          route: Routes.PRO_HUB.ROOT,
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
  }, [isKnownNonMember, isMember, labelKey, navigation, trackButtonClicked]);

  return {
    showOrangeEntry,
    isLabelPending,
    label: strings(labelKey),
    onPress,
  };
}
