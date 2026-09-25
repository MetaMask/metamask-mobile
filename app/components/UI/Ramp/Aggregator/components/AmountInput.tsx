import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { AnimatedAmountDisplay } from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
import Box from './Box';
import SkeletonText from './SkeletonText';
import DownChevronText from './DownChevronText';
import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import { BuildQuoteSelectors } from '../Views/BuildQuote/BuildQuote.testIds';
import { useTheme } from '../../../../../util/theme';

const styles = StyleSheet.create({
  amount: {
    fontSize: 24,
    lineHeight: 32,
  },
  amountWithCursor: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cursor: {
    height: 24,
    marginHorizontal: 1,
    width: 1,
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
  tokenSymbol?: string;
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
  tokenSymbol,
  onPress,
  onCurrencyPress,
}: Props) => {
  const { colors } = useTheme();
  const amountStyle = [
    styles.amount,
    {
      color: highlightedError ? colors.error.default : colors.text.default,
    },
  ];

  const renderAmountContent = () => {
    if (loading) {
      return <SkeletonText medium />;
    }

    if (highlighted) {
      if (tokenSymbol) {
        const suffix = ` ${tokenSymbol}`;
        const amountWithoutSymbol = amount.endsWith(suffix)
          ? amount.slice(0, -suffix.length)
          : amount.replace(tokenSymbol, '').trimEnd();

        return (
          <AnimatedAmountDisplay
            containerStyle={styles.amountWithCursor}
            cursor={{
              testID: BuildQuoteSelectors.AMOUNT_INPUT_CURSOR,
              style: [
                styles.cursor,
                { backgroundColor: colors.primary.default },
              ],
            }}
            onPress={onPress}
            rollDigits={false}
            style={amountStyle}
            suffix={suffix}
            testID={BuildQuoteSelectors.AMOUNT_INPUT}
            value={amountWithoutSymbol}
          />
        );
      }

      return (
        <AnimatedAmountDisplay
          containerStyle={styles.amountWithCursor}
          cursor={{
            testID: BuildQuoteSelectors.AMOUNT_INPUT_CURSOR,
            style: [styles.cursor, { backgroundColor: colors.primary.default }],
          }}
          onPress={onPress}
          prefix={currencySymbol}
          rollDigits={false}
          style={amountStyle}
          testID={BuildQuoteSelectors.AMOUNT_INPUT}
          value={amount}
        />
      );
    }

    return (
      <AnimatedAmountDisplay
        onPress={onPress}
        prefix={currencySymbol}
        style={amountStyle}
        testID={BuildQuoteSelectors.AMOUNT_INPUT}
        value={amount}
      />
    );
  };

  return (
    <Box label={label} highlighted={highlighted} compact>
      <ListItem>
        <ListItemColumn widthType={WidthType.Fill}>
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${currencySymbol || ''}${amount}`}
            onPress={onPress}
            hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
            testID={BuildQuoteSelectors.AMOUNT_INPUT}
          >
            {renderAmountContent()}
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
};

export default AmountInput;
