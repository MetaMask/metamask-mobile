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
  MoneyAccountPlusEntry,
  resolveMoneyAccountPlusEntry,
  useMoneyAccountPlusAccessState,
} from './useMoneyAccountPlusAccess';
import { useHasProMembership } from './useHasProMembership';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

export interface UseMetamaskOrangeEntryResult {
  /**
   * True when the Pro flow is on and the label is already known. Home starts
   * the subscriptions fetch, so the row is present with the right copy when
   * the menu opens. It stays hidden until a membership is stored or the
   * fetch settles on a non-member.
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
 *
 * Routing follows `resolveMoneyAccountPlusEntry`, the rule Pro Hub and the
 * subscription screen also use. A stored membership shows "MetaMask Orange"
 * and opens Pro Hub. A settled non-member, including a leftover entitlement,
 * shows "Join MetaMask Orange" and opens Benefits. Home prefetches
 * subscriptions, so this hook only reads the stored result.
 */
export function useMetamaskOrangeEntry(): UseMetamaskOrangeEntryResult {
  const navigation = useNavigation<AppNavigationProp>();
  const { isProSubscriptionEnabled } = useProSubscriptionEnabled();
  const { access, isSubscriptionsSettled } = useMoneyAccountPlusAccessState();
  const hasMembership = useHasProMembership();
  const { trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.ACCOUNTS_MENU,
  });
  // Home starts the subscriptions query, so a stored plan labels the row
  // before any refetch here finishes.
  const entry = isProSubscriptionEnabled
    ? resolveMoneyAccountPlusEntry({
        access,
        hasMembership,
        isSubscriptionsSettled,
      })
    : MoneyAccountPlusEntry.Disabled;
  const isMember = entry === MoneyAccountPlusEntry.Hub;
  const isKnownNonMember = entry === MoneyAccountPlusEntry.Join;
  const showOrangeEntry = isMember || isKnownNonMember;
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
    label: strings(labelKey),
    onPress,
  };
}
