import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Card,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useActiveMfaFlow } from '../../../../../util/identity/mfa/engine/useActiveMfaFlow';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import MoneyMfaShieldAnimation from './MoneyMfaShieldAnimation';

interface MoneyMfaSetupCardProps {
  onSetUp: () => void;
}

/**
 * "Protect your Money account" card on Money home.
 *
 * @param props - The card's props.
 * @param props.onSetUp - Opens the passkey intro.
 */
const MoneyMfaSetupCard = ({ onSetUp }: MoneyMfaSetupCardProps) => {
  // The 2FA screen opens only once its first step is ready.
  const isStarting = useActiveMfaFlow()?.state.step.name === 'idle';

  return (
    <Card
      twClassName="mx-4 mt-2 mb-2 flex-row items-center gap-4 bg-muted"
      testID={MoneyMfaTestIds.SETUP_CARD}
    >
      <Box twClassName="flex-1 items-start gap-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('money.mfa.card_title')}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('money.mfa.card_description')}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Md}
          onPress={onSetUp}
          isLoading={isStarting}
          isDisabled={isStarting}
          twClassName="mt-2"
          testID={MoneyMfaTestIds.SETUP_CARD_BUTTON}
        >
          {strings('money.mfa.card_cta')}
        </Button>
      </Box>
      <MoneyMfaShieldAnimation size={96} />
    </Card>
  );
};

export default MoneyMfaSetupCard;
