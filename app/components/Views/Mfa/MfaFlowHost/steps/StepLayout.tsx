import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type {
  MfaFlowAction,
  MfaFlowErrorCode,
  MfaFlowState,
  MfaFlowStep,
  MfaReason,
} from '../../../../../util/identity/mfa/engine/types';
import { getErrorMessage } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';

/**
 * What every step screen receives. Screens only read state and send actions.
 */
export interface StepProps<Name extends MfaFlowStep['name']> {
  step: Extract<MfaFlowStep, { name: Name }>;
  state: MfaFlowState;
  reason: MfaReason;
  onAction: (action: MfaFlowAction) => void;
}

interface StepLayoutProps {
  title: string;
  description?: string;
  error?: MfaFlowErrorCode;
  top?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}

export const StepError = ({ code }: { code: MfaFlowErrorCode }) => (
  <Text
    variant={TextVariant.BodyMd}
    color={TextColor.ErrorDefault}
    testID={MfaFlowSelectorsIDs.ERROR}
  >
    {getErrorMessage(code)}
  </Text>
);

const StepLayout = ({
  title,
  description,
  error,
  top,
  children,
  footer,
}: StepLayoutProps) => {
  const tw = useTailwind();
  return (
    <KeyboardAvoidingView
      style={tw.style('flex-1')}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={tw.style('px-4 pt-4 pb-6 gap-4')}
        keyboardShouldPersistTaps="handled"
      >
        {top}
        <Text variant={TextVariant.HeadingLg}>{title}</Text>
        {description ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {description}
          </Text>
        ) : null}
        {children}
        {error ? <StepError code={error} /> : null}
      </ScrollView>
      {footer ? <Box twClassName="px-4 pb-4 gap-2">{footer}</Box> : null}
    </KeyboardAvoidingView>
  );
};

export default StepLayout;
