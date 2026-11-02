import React, { type ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Box,
  HelpText,
  HelpTextSeverity,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  MfaFlowAction,
  MfaFlowErrorCode,
  MfaFlowState,
  MfaFlowStep,
  MfaMethod,
  MfaReason,
} from '../../../../../util/identity/mfa/engine/types';
import shieldImage from '../../../../../images/mfa-shield.png';
import { strings } from '../../../../../../locales/i18n';
import { getErrorLink, getErrorMessage } from '../../labels';
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
  /** Centers the content vertically, as on result screens. */
  isVerticallyCentered?: boolean;
}

/** The 2-step verification shield, above the title of the intro and picker. */
export const MfaShield = () => {
  const tw = useTailwind();
  return (
    <Image
      source={shieldImage}
      style={tw.style('w-[88px] h-[88px] self-center')}
      resizeMode="contain"
    />
  );
};

export const StepError = ({
  code,
  method,
}: {
  code: MfaFlowErrorCode;
  method?: MfaMethod;
}) => {
  const link = getErrorLink(code);
  return (
    <HelpText
      severity={HelpTextSeverity.Danger}
      accessibilityRole="alert"
      testID={MfaFlowSelectorsIDs.ERROR}
    >
      {getErrorMessage(code, method)}
      {link ? (
        <>
          {' '}
          <TextButton
            variant={TextVariant.BodySm}
            onPress={() => Linking.openURL(link)}
            testID={MfaFlowSelectorsIDs.ERROR_LINK}
          >
            {strings('mfa.errors.learn_more')}
          </TextButton>
        </>
      ) : null}
    </HelpText>
  );
};

/**
 * The step's title and description, centred under an image (the intro and
 * picker shield, the failure icon).
 *
 * @param props - The header's props.
 * @param props.title - The title.
 * @param props.description - The line under it, if any.
 * @param props.isCentered - Whether an image sits above it.
 */
export const StepHeader = ({
  title,
  description,
  isCentered,
}: Pick<StepLayoutProps, 'title' | 'description'> & {
  isCentered: boolean;
}) => {
  const textAlign = isCentered ? 'text-center' : undefined;
  return (
    <Box twClassName="gap-2">
      <Text variant={TextVariant.HeadingLg} twClassName={textAlign}>
        {title}
      </Text>
      {description ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName={textAlign}
        >
          {description}
        </Text>
      ) : null}
    </Box>
  );
};

const StepLayout = ({
  title,
  description,
  error,
  top,
  children,
  footer,
  isVerticallyCentered = false,
}: StepLayoutProps) => {
  const tw = useTailwind();
  const { bottom } = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={tw.style('flex-1')}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      // Over the keyboard, the footer keeps the designs' 24px gap rather than
      // the home indicator's.
      keyboardVerticalOffset={16 - bottom}
    >
      <ScrollView
        contentContainerStyle={tw.style(
          'px-4 pt-4 pb-6 gap-4',
          isVerticallyCentered && 'flex-grow justify-center',
        )}
        keyboardShouldPersistTaps="handled"
      >
        {top}
        <StepHeader
          title={title}
          description={description}
          isCentered={top !== undefined}
        />
        {children}
        {error ? <StepError code={error} /> : null}
      </ScrollView>
      {footer ? (
        <Box
          twClassName="px-4 pt-4 gap-2"
          style={{ paddingBottom: 8 + bottom }}
        >
          {footer}
        </Box>
      ) : null}
    </KeyboardAvoidingView>
  );
};

export default StepLayout;
