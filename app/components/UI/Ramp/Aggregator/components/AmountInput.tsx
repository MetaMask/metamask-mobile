import React from 'react';
import { StyleSheet } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import Box from './Box';
import SkeletonText from './SkeletonText';
import DownChevronText from './DownChevronText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { BuildQuoteSelectors } from '../Views/BuildQuote/BuildQuote.testIds';

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

export interface Props {
  label?: string;
  currencySymbol?: string;
  amount: string;
  currencyCode?: string;
  highlighted?: boolean;
  loading?: boolean;
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
  loading,
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
          testID={BuildQuoteSelectors.AMOUNT_INPUT}
        >
          {loading ? (
            <SkeletonText medium />
          ) : (
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
          )}
        </TouchableOpacity>
      </ListItemColumn>

      {onCurrencyPress ? (
        <ListItemColumn style={styles.chevron}>
          {loading ? (
            <SkeletonText small />
          ) : (
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              disabled={!onCurrencyPress}
              onPress={onCurrencyPress}
              hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
              testID={BuildQuoteSelectors.SELECT_CURRENCY}
            >
              <DownChevronText text={currencyCode} />
            </TouchableOpacity>
          )}
        </ListItemColumn>
      ) : null}
    </ListItem>
  </Box>
);

export default AmountInput;
