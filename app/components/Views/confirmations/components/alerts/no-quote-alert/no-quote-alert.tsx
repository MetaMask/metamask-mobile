import React, { useCallback, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { QuoteErrorInfo } from '@metamask/transaction-pay-controller';
import { AlertMessage } from '../alert-message';

const TAPS_TO_TOGGLE = 2;

interface Props {
  error: QuoteErrorInfo;
}

export function NoQuoteAlert({ error }: Props) {
  const [tapCount, setTapCount] = useState(0);
  const isExpanded = Math.floor(tapCount / TAPS_TO_TOGGLE) % 2 === 1;
  const handlePress = useCallback(() => setTapCount((c) => c + 1), []);

  const collapsedMessage =
    error.reason === 'insufficient-source-balance'
      ? strings('alert_system.insufficient_pay_method_balance.message')
      : strings('alert_system.no_pay_token_quotes.message');

  const allMessages = useMemo(() => {
    const messages = [collapsedMessage];

    if (error.message && isExpanded) {
      messages.push(error.message);
    }

    if (error.detail && isExpanded) {
      messages.push(...error.detail);
    }

    return messages;
  }, [collapsedMessage, error, isExpanded]);

  return (
    <Pressable onPress={handlePress} testID="no-quote-alert">
      <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
        {allMessages.map((message, index) => (
          <AlertMessage alertMessage={message} key={index} />
        ))}
      </Box>
    </Pressable>
  );
}
