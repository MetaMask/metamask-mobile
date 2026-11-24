// PROTOTYPE-DO-NOT-MERGE
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  TextField,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { GEORGE_COPY } from './prototypeConstants';
import { KalshiPrototypePhoneEntrySelectorsIDs } from './KalshiPrototypePhoneEntry.testIds';

interface KalshiPrototypePhoneEntryProps {
  /** Sends the code to the number; the fake accepts any well-formed one. */
  onSend: (phoneNumber: string) => void | Promise<void>;
  /** Leaves the screen. */
  onBack: () => void;
}

/**
 * The Kalshi phone step. No shared phone-entry view existed to reuse, so
 * this follows George's phone screen — his copy, a single number field, and
 * the send action his step has.
 *
 * @param props - The send and back handlers.
 * @returns The screen.
 */
const KalshiPrototypePhoneEntry = ({
  onSend,
  onBack,
}: KalshiPrototypePhoneEntryProps) => {
  const tw = useTailwind();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend(phoneNumber.trim());
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={KalshiPrototypePhoneEntrySelectorsIDs.CONTAINER}
    >
      <HeaderStandard onBack={onBack} includesTopInset />
      <Box twClassName="flex-1 px-4">
        <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
          {GEORGE_COPY.phone.title}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {GEORGE_COPY.phone.body}
        </Text>
        <Box twClassName="mt-6">
          <TextField
            testID={KalshiPrototypePhoneEntrySelectorsIDs.INPUT}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+18888888888"
            inputProps={{
              autoCapitalize: 'none',
              autoCorrect: false,
              keyboardType: 'phone-pad',
            }}
          />
        </Box>
      </Box>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={phoneNumber.trim().length === 0}
          isLoading={isSending}
          onPress={handleSend}
          testID={KalshiPrototypePhoneEntrySelectorsIDs.SEND_BUTTON}
        >
          {GEORGE_COPY.phone.sendCode}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default KalshiPrototypePhoneEntry;
