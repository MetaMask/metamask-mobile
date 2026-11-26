import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BoxGlass from '../../../../../component-library/components-temp/BoxGlass';
import { strings } from '../../../../../../locales/i18n';
import { useActiveMfaFlow } from '../../../../../util/identity/mfa/engine/useActiveMfaFlow';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import MoneyMfaShieldAnimation from './MoneyMfaShieldAnimation';

interface MoneyMfaSetupCardProps {
  onSetUp: () => void;
  isGlass?: boolean;
}

const MoneyMfaSetupCard = ({
  onSetUp,
  isGlass = false,
}: MoneyMfaSetupCardProps) => {
  const tw = useTailwind();
  // The 2FA screen opens only once its first step is ready.
  const activeFlow = useActiveMfaFlow();
  const isStarting =
    activeFlow?.flow.reason.operation.startsWith('money.') === true &&
    activeFlow.state.step.name === 'idle';

  return (
    <BoxGlass
      isGlass={isGlass}
      radiusClassName="rounded-2xl"
      hasSheen
      containerStyle={tw.style('mx-4 mt-2 mb-2')}
      style={tw.style('flex-row items-center gap-4 p-4')}
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
    </BoxGlass>
  );
};

export default MoneyMfaSetupCard;
