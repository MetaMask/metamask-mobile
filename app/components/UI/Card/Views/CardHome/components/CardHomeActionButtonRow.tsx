import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import MainActionButtonGlass from '../../../../../../component-library/components-temp/MainActionButtonGlass';
import SnowflakeIcon from '../../../components/SnowflakeIcon';
import { CardHomeSelectors } from '../CardHome.testIds';
import {
  CardStatus,
  type CardDetails,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface ActionButtonConfig {
  onPress: () => void;
  disabled?: boolean;
}

export interface CardHomeActionButtonRowProps {
  /** Add funds. Omitted when the provider offers no add-funds action. */
  add?: ActionButtonConfig;
  /** Reveal or hide the card number, expiry and CVV. */
  details?: ActionButtonConfig & { isShowingDetails: boolean };
  /** View the card PIN. Omitted when the provider or card has no PIN view. */
  pin?: ActionButtonConfig;
  /** Freeze or unfreeze the card. Omitted when the card can't be frozen. */
  freeze?: ActionButtonConfig & { isFrozen: boolean };
  /** Brand refresh Liquid Glass tiles; resolved by the screen. */
  isGlass?: boolean;
  /** Tighter top gap when something (e.g. Add to Apple Wallet) sits directly above. */
  isTightTop?: boolean;
}

export interface CardHomeActionVisibilityInput {
  card: CardDetails | null | undefined;
  capabilities: CardProviderCapabilities | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSetupActions: boolean;
  hasAlertOnlyState: boolean;
  /** Blocked card or forced UK migration: the manage list was not rendered. */
  isManageHidden: boolean;
}

export interface CardHomeActionVisibility {
  details: boolean;
  pin: boolean;
  freeze: boolean;
}

/**
 * Which quick actions to show. A signed-in cardholder sees Details, PIN, and
 * Freeze even at a zero balance. The old Baanx manage rows hid those until
 * the card was funded; these buttons do not.
 */
export const getCardHomeActionVisibility = ({
  card,
  capabilities,
  isAuthenticated,
  isLoading,
  hasSetupActions,
  hasAlertOnlyState,
  isManageHidden,
}: CardHomeActionVisibilityInput): CardHomeActionVisibility => {
  if (isManageHidden || hasSetupActions || hasAlertOnlyState) {
    return { details: false, pin: false, freeze: false };
  }

  // The quick actions always show for a signed-in cardholder, even with a
  // zero balance (unlike the old Manage rows, which Baanx hid until funded).
  // Signed-out callers never reach this screen except during KYC review,
  // and they do not get the cardholder actions.
  const hasManageableCard = isAuthenticated && !isLoading && Boolean(card);

  // Providers set hasPin on CardDetails; absent means treat as true.
  const cardHasPin = card?.hasPin !== false;

  return {
    details: hasManageableCard,
    pin:
      hasManageableCard && Boolean(capabilities?.supportsPinView) && cardHasPin,
    freeze:
      hasManageableCard &&
      Boolean(capabilities?.supportsFreeze) &&
      Boolean(card?.isFreezable) &&
      card?.status !== CardStatus.BLOCKED,
  };
};

const styles = StyleSheet.create({
  buttonContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});

/**
 * Card home quick actions under the card panel. Same tiles as the Money home
 * action row (`MainActionButtonGlass`). Each button is optional. Visibility
 * comes from `getCardHomeActionVisibility`.
 */
const CardHomeActionButtonRow = ({
  add,
  details,
  pin,
  freeze,
  isGlass = false,
  isTightTop = false,
}: CardHomeActionButtonRowProps) => {
  if (!add && !details && !pin && !freeze) return null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName={`px-4 ${isTightTop ? 'pt-2' : 'pt-4'} pb-2 gap-2`}
      testID={CardHomeSelectors.ACTION_BUTTON_ROW}
    >
      {add ? (
        <MainActionButtonGlass
          iconName={IconName.Add}
          label={strings('card.card_home.action_buttons.add')}
          onPress={add.onPress}
          isDisabled={add.disabled}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
          twClassName="py-3"
          containerStyle={styles.buttonContainer}
          isGlass={isGlass}
        />
      ) : null}
      {details ? (
        <MainActionButtonGlass
          iconName={details.isShowingDetails ? IconName.EyeSlash : IconName.Eye}
          label={strings(
            details.isShowingDetails
              ? 'card.card_home.action_buttons.hide_details'
              : 'card.card_home.action_buttons.details',
          )}
          onPress={details.onPress}
          isDisabled={details.disabled}
          testID={CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON}
          twClassName="py-3"
          containerStyle={styles.buttonContainer}
          isGlass={isGlass}
        />
      ) : null}
      {pin ? (
        <MainActionButtonGlass
          iconName={IconName.Key}
          label={strings('card.card_home.action_buttons.view_pin')}
          onPress={pin.onPress}
          isDisabled={pin.disabled}
          testID={CardHomeSelectors.VIEW_PIN_BUTTON}
          twClassName="py-3"
          containerStyle={styles.buttonContainer}
          isGlass={isGlass}
        />
      ) : null}
      {freeze ? (
        <MainActionButtonGlass
          customIcon={<SnowflakeIcon />}
          label={strings(
            freeze.isFrozen
              ? 'card.card_home.action_buttons.unfreeze'
              : 'card.card_home.action_buttons.freeze',
          )}
          onPress={freeze.onPress}
          isDisabled={freeze.disabled}
          testID={CardHomeSelectors.FREEZE_CARD_BUTTON}
          twClassName="py-3"
          containerStyle={styles.buttonContainer}
          isGlass={isGlass}
        />
      ) : null}
    </Box>
  );
};

export default CardHomeActionButtonRow;
