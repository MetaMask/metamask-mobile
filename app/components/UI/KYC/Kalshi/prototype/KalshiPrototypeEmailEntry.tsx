// PROTOTYPE-DO-NOT-MERGE
import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  HelpText,
  HelpTextSeverity,
  TextField,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import StepLayout from '../../../../Views/Mfa/MfaFlowHost/steps/StepLayout';
import { GEORGE_COPY, PROTOTYPE_COPY } from './prototypeConstants';
import KalshiWordmark from './KalshiWordmark';
import { KalshiPrototypeEmailEntrySelectorsIDs } from './KalshiPrototypeEmailEntry.testIds';

interface KalshiPrototypeEmailEntryProps {
  /** Sends the code to the entered address. */
  onSend: (email: string) => void | Promise<void>;
  /** Leaves the screen. */
  onBack: () => void;
}

// A loose shape check: something, an @, a domain with a dot.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The shared MFA layout sends actions; this screen has none to send.
const noAction = () => undefined;

/**
 * The email Kalshi sends its code to, opened from "Use my Kalshi email" for an existing Kalshi account.
 * Laid out like the Kalshi phone screen: the shared MFA step layout under the
 * Kalshi wordmark.
 *
 * @param props - The send and back handlers.
 * @returns The screen.
 */
const KalshiPrototypeEmailEntry = ({
  onSend,
  onBack,
}: KalshiPrototypeEmailEntryProps) => {
  const tw = useTailwind();
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const trimmed = email.trim();
  const isValid = EMAIL_PATTERN.test(trimmed);

  const handleSend = async () => {
    if (!isValid) {
      setShowError(true);
      return;
    }
    setIsSending(true);
    try {
      await onSend(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Box
      style={tw.style('flex-1 bg-default')}
      testID={KalshiPrototypeEmailEntrySelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={<KalshiWordmark />}
        onBack={onBack}
        includesTopInset
      />
      <StepLayout
        onAction={noAction}
        title={PROTOTYPE_COPY.emailEntry.title}
        description={PROTOTYPE_COPY.emailEntry.body}
        footer={
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={trimmed.length === 0}
            isLoading={isSending}
            onPress={handleSend}
            testID={KalshiPrototypeEmailEntrySelectorsIDs.SEND_BUTTON}
          >
            {GEORGE_COPY.phone.sendCode}
          </Button>
        }
      >
        <Box twClassName="gap-2">
          <TextField
            testID={KalshiPrototypeEmailEntrySelectorsIDs.INPUT}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setShowError(false);
            }}
            onBlur={() => setShowError(trimmed.length > 0 && !isValid)}
            placeholder={PROTOTYPE_COPY.emailEntry.placeholder}
            isError={showError}
            autoFocus
            inputProps={{
              keyboardType: 'email-address',
              textContentType: 'emailAddress',
              autoComplete: 'email',
              autoCapitalize: 'none',
              autoCorrect: false,
            }}
          />
          {showError ? (
            <HelpText
              severity={HelpTextSeverity.Danger}
              accessibilityRole="alert"
              testID={KalshiPrototypeEmailEntrySelectorsIDs.ERROR}
            >
              {PROTOTYPE_COPY.emailEntry.invalid}
            </HelpText>
          ) : null}
        </Box>
      </StepLayout>
    </Box>
  );
};

export default KalshiPrototypeEmailEntry;
