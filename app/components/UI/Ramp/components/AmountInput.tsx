import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Box from './Box';
import BaseListItem from '../../../Base/ListItem';
import Text from '../../../Base/Text';
import CurrencyChevron from './CurrencyChevron';

// TODO: Convert into typescript and correctly type optionals
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ListItem = BaseListItem as any;

const styles = StyleSheet.create({
  amount: {
    fontSize: 24,
  },
  chevron: {
    flex: 0,
    marginLeft: 8,
  },
});

interface Props {
  label?: string;
  currencySymbol?: string;
  amount: string;
  currencyCode?: string;
  highlighted?: boolean;
  highlightedError?: boolean;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPress?: () => any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onCurrencyPress?: () => any;
}

const AmountInput: React.FC<Props> = ({
  label,
  currencySymbol,
  amount,
  currencyCode,
  highlighted,
  highlightedError,
  onPress,
  onCurrencyPress,
}: Props) => (
  <Box label={label} highlighted={highlighted}>
    <ListItem.Content>
      <ListItem.Body>
        <TouchableOpacity
          accessible
          accessibilityRole="button"
          onPress={onPress}
          hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
        >
          <Text
            black={!highlightedError}
            red={highlightedError}
            bold
            style={styles.amount}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {currencySymbol || ''}
            {amount}
          </Text>
        </TouchableOpacity>
      </ListItem.Body>
      {onCurrencyPress ? (
        <ListItem.Amounts style={styles.chevron}>
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            disabled={!onCurrencyPress}
            onPress={onCurrencyPress}
            hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
          >
            <CurrencyChevron currency={currencyCode} />
          </TouchableOpacity>
        </ListItem.Amounts>
      ) : null}
    </ListItem.Content>
  </Box>
);

export default AmountInput;
