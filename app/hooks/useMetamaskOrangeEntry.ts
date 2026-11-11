import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { strings } from '../../locales/i18n';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../components/UI/Money/constants/moneyEvents';
import { useMoneyAnalytics } from '../components/UI/Money/hooks/useMoneyAnalytics';
import { selectIsMoneyAccountGeoEligible } from '../components/UI/Money/selectors/eligibility';
import Routes from '../constants/navigation/Routes';
import type { AppNavigationProp } from '../core/NavigationService/types';
import { useHasProMembership } from './useHasProMembership';
import { useProSubscriptionEnabled } from './useProSubscriptionEnabled';

export interface UseMetamaskOrangeEntryResult {
  /**
   * True when the Pro flow is on and the user may see Orange. A blocked
   * country hides the join row. An existing member still sees it so they
   * can open Pro Hub. Unknown geolocation stays hidden until it resolves.
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
  const isGeoEligible = useSelector(selectIsMoneyAccountGeoEligible);
  const hasMembership = useHasProMembership();
  const { trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.ACCOUNTS_MENU,
  });
  // Join stays hidden in a blocked or unresolved country. A member still
  // sees the row so they can manage or cancel from Pro Hub.
  const showOrangeEntry =
    isProSubscriptionEnabled && (isGeoEligible || hasMembership);
  const labelKey = hasMembership
    ? 'accounts_menu.metamask_orange'
    : 'accounts_menu.join_metamask_orange';

  const onPress = useCallback(() => {
    // Statuses Pro Hub can show open the hub. Canceled, incomplete,
    // incomplete-expired, no subscription, and a still-loading membership
    // open Benefits.
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
