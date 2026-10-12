import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getMethodLabel } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { MfaShield, type StepProps } from './StepLayout';

const IntroStep = ({ step, state, reason, onAction }: StepProps<'intro'>) => (
  <StepLayout
    top={<MfaShield />}
    title={strings('mfa.intro.title')}
    description={reason.enrollDescription ?? strings('mfa.intro.description')}
    error={state.error}
    footer={
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        isLoading={state.busy}
        onPress={() => onAction({ type: 'continue' })}
        testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
      >
        {strings('mfa.intro.continue')}
      </Button>
    }
  >
    <Text variant={TextVariant.BodyMd}>{strings('mfa.intro.list_title')}</Text>
    {step.missing.map((method) => (
      <Box key={method} twClassName="flex-row items-center gap-3">
        <Icon
          name={method === 'email_otp' ? IconName.Mail : IconName.SecurityKey}
          color={IconColor.IconAlternative}
        />
        <Text variant={TextVariant.BodyMd}>{getMethodLabel(method)}</Text>
      </Box>
    ))}
  </StepLayout>
);

export default IntroStep;
