import React from 'react';
import { Platform } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { MfaMethod } from '../../../../../util/identity/mfa/engine/types';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import { MfaShield, StepError, StepHeader, type StepProps } from './StepLayout';

const PICKER_LABEL_KEYS: Record<MfaMethod, string> = {
  email_otp: 'mfa.picker.email_otp',
  passkey: 'mfa.picker.passkey',
};

/**
 * The picker sheet's content: a passkey, when offered, is the main button,
 * with the biometrics icon; the other methods follow below an "or".
 *
 * @param props - The step's props.
 * @param props.step - The picker step.
 * @param props.state - The flow state.
 * @param props.reason - Why the feature asks.
 * @param props.onAction - Sends the chosen method.
 */
const PickerStep = ({ step, state, reason, onAction }: StepProps<'picker'>) => {
  const hasPasskey = step.options.includes('passkey');
  const others = step.options.filter((method) => method !== 'passkey');
  const renderOption = (method: MfaMethod, isMain: boolean) => (
    <Button
      key={method}
      variant={isMain ? ButtonVariant.Primary : ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      isFullWidth
      isDisabled={state.busy}
      startIconName={
        isMain
          ? Platform.select({
              ios: IconName.FaceId,
              default: IconName.Fingerprint,
            })
          : undefined
      }
      onPress={() => onAction({ type: 'choose', method })}
      testID={`${MfaFlowSelectorsIDs.PICKER_OPTION}-${method}`}
    >
      {strings(PICKER_LABEL_KEYS[method])}
    </Button>
  );

  return (
    <Box twClassName="px-4 pb-4 gap-4">
      <MfaShield />
      <StepHeader
        title={strings('mfa.picker.title')}
        description={
          step.purpose === 'verify' ? reason.verifyDescription : undefined
        }
        isCentered
      />
      {state.error ? <StepError code={state.error} /> : null}
      <Box twClassName="pt-4 gap-4">
        {hasPasskey ? renderOption('passkey', true) : null}
        {hasPasskey && others.length > 0 ? (
          <Box twClassName="flex-row items-center gap-4">
            <Box twClassName="flex-1 border-t border-muted" />
            <Text variant={TextVariant.BodyMd} color={TextColor.TextMuted}>
              {strings('mfa.picker.or')}
            </Text>
            <Box twClassName="flex-1 border-t border-muted" />
          </Box>
        ) : null}
        {others.map((method) => renderOption(method, false))}
      </Box>
    </Box>
  );
};

export default PickerStep;
