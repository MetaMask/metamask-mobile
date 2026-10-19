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
  ListItem,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MfaMethod } from '../../../../../util/identity/mfa/engine/types';
import { getMethodLabel, maskEmail } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { MfaShield, type StepProps } from './StepLayout';

const METHOD_ICONS: Record<MfaMethod, IconName> = {
  email_otp: IconName.Mail,
  passkey: IconName.Key,
};

/**
 * What a method's row says: how it works, or what is set up already.
 *
 * @param method - The method.
 * @param isDone - Whether it is set up already.
 * @param email - The email set up for codes, if any.
 * @returns The row's description.
 */
const getDescription = (
  method: MfaMethod,
  isDone: boolean,
  email?: string,
): string | undefined => {
  if (method === 'passkey') {
    return strings(
      isDone ? 'mfa.intro.passkey_done' : 'mfa.intro.passkey_description',
    );
  }
  if (isDone) {
    return email ? maskEmail(email) : undefined;
  }
  return strings('mfa.intro.email_description');
};

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
    <Box twClassName="gap-3 pt-3">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('mfa.intro.list_title')}
      </Text>
      <Box twClassName="bg-muted rounded-3xl">
        {step.methods.map((method) => {
          const isDone = !step.missing.includes(method);
          return (
            <ListItem
              key={method}
              twClassName="min-h-14"
              accessoryGap={3}
              startAccessory={<Icon name={METHOD_ICONS[method]} />}
              endAccessory={
                isDone ? (
                  <Icon
                    name={IconName.Check}
                    color={IconColor.SuccessDefault}
                  />
                ) : undefined
              }
              title={getMethodLabel(method)}
              description={getDescription(method, isDone, step.email)}
              descriptionProps={{ fontWeight: FontWeight.Regular }}
              testID={`${MfaFlowSelectorsIDs.INTRO_METHOD}-${method}${
                isDone ? '-done' : ''
              }`}
            />
          );
        })}
      </Box>
    </Box>
  </StepLayout>
);

export default IntroStep;
