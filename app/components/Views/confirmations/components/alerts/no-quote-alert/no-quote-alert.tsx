import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import type { QuoteErrorInfo } from '@metamask/transaction-pay-controller';

const TAPS_TO_EXPAND = 5;
const DETAILS_BACKGROUND = 'rgba(128, 128, 128, 0.25)';

interface Props {
  error: QuoteErrorInfo;
}

export function NoQuoteAlert({ error }: Props) {
  const { colors } = useTheme();
  const [tapCount, setTapCount] = useState(0);

  const handlePress = useCallback(() => {
    setTapCount((c) => Math.min(c + 1, TAPS_TO_EXPAND));
  }, []);

  const isExpanded = tapCount >= TAPS_TO_EXPAND;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        message: {
          color: colors.text.default,
        },
        detailsBlock: {
          marginTop: 6,
          paddingVertical: 6,
          paddingHorizontal: 8,
          backgroundColor: DETAILS_BACKGROUND,
          borderRadius: 4,
        },
        detailRow: {
          color: colors.text.default,
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
          fontSize: 11,
          lineHeight: 18,
        },
      }),
    [colors],
  );

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
            <Text key={row} style={styles.detailRow}>
              {row}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}
