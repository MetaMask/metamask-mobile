import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../hooks/useStyles';
import type { QuoteErrorInfo } from '@metamask/transaction-pay-controller';
import styleSheet from './no-quote-alert.styles';

const TAPS_TO_TOGGLE = 2;

interface Props {
  error: QuoteErrorInfo;
}

export function NoQuoteAlert({ error }: Props) {
  const { styles } = useStyles(styleSheet, {});
  const [tapCount, setTapCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePress = useCallback(() => {
    setTapCount((count) => {
      const nextCount = count + 1;

      if (nextCount >= TAPS_TO_TOGGLE) {
        setIsExpanded((expanded) => !expanded);
        return 0;
      }

      return nextCount;
    });
  }, []);

  const collapsedMessage =
    error.reason === 'insufficient-source-balance'
      ? strings('alert_system.insufficient_pay_method_balance.message')
      : strings('alert_system.no_pay_token_quotes.message');

  return (
    <Pressable onPress={handlePress} testID="no-quote-alert">
      <Text variant={TextVariant.BodySM} style={styles.message}>
        {isExpanded ? error.message : collapsedMessage}
      </Text>
      {isExpanded && error.detail && error.detail.length > 0 && (
        <View style={styles.detailsBlock} testID="no-quote-alert-details">
          {error.detail.map((row) => (
            <Text
              key={row}
              variant={TextVariant.BodyXS}
              style={styles.detailRow}
            >
              {row}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}
