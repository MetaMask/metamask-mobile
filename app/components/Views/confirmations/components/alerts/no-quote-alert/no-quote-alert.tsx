import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../hooks/useStyles';
import type { QuoteErrorInfo } from '@metamask/transaction-pay-controller';
import styleSheet from './no-quote-alert.styles';

const TAPS_TO_EXPAND = 2;

interface Props {
  error: QuoteErrorInfo;
}

export function NoQuoteAlert({ error }: Props) {
  const { styles } = useStyles(styleSheet, {});
  const [tapCount, setTapCount] = useState(0);

  const handlePress = useCallback(() => {
    setTapCount((count) => Math.min(count + 1, TAPS_TO_EXPAND));
  }, []);

  const isExpanded = tapCount >= TAPS_TO_EXPAND;

  return (
    <Pressable onPress={handlePress}>
      <Text variant={TextVariant.BodySM} style={styles.message}>
        {isExpanded
          ? error.message
          : strings('alert_system.no_pay_token_quotes.message')}
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
