import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Box from './Box';
import CurrencyChevron from './CurrencyChevron';
import ListItem from '../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';

const styles = StyleSheet.create({
  amount: {
    fontSize: 24,
    lineHeight: 32,
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
  <Box label={label} highlighted={highlighted} compact>
    <ListItem>
      <ListItemColumn widthType={WidthType.Fill}>
        <TouchableOpacity
          accessible
          accessibilityRole="button"
          onPress={onPress}
          hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.amount}
            variant={TextVariant.BodyMDMedium}
            color={highlightedError ? TextColor.Error : TextColor.Default}
          >
            {currencySymbol || ''}
            {amount}
          </Text>
        </TouchableOpacity>
      </ListItemColumn>

      {onCurrencyPress ? (
        <ListItemColumn style={styles.chevron}>
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            disabled={!onCurrencyPress}
            onPress={onCurrencyPress}
            hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
          >
            <CurrencyChevron currency={currencyCode} />
          </TouchableOpacity>
        </ListItemColumn>
      ) : null}
    </ListItem>
  </Box>
);

export default AmountInput;
