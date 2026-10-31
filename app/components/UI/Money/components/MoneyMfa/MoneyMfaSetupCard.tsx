import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

interface MoneyMfaSetupCardProps {
  onSetUp: () => void;
}

/**
 * "Protect your Money account" card on Money home.
 *
 * @param props - The card's props.
 * @param props.onSetUp - Opens the passkey intro.
 */
const MoneyMfaSetupCard = ({ onSetUp }: MoneyMfaSetupCardProps) => (
  <Box
    twClassName="mx-4 mt-4 flex-row gap-3 rounded-xl bg-muted p-4"
    testID={MoneyMfaTestIds.SETUP_CARD}
  >
    <Box twClassName="h-8 w-8 items-center justify-center rounded-full bg-default">
      <Icon
        name={IconName.SecurityTick}
        size={IconSize.Sm}
        color={IconColor.SuccessDefault}
      />
    </Box>
    <Box twClassName="flex-1 items-start gap-1">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('money.mfa.card_title')}
      </Text>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('money.mfa.card_description')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        onPress={onSetUp}
        twClassName="mt-2"
        testID={MoneyMfaTestIds.SETUP_CARD_BUTTON}
      >
        {strings('money.mfa.card_cta')}
      </Button>
    </Box>
  </Box>
);

export default MoneyMfaSetupCard;
