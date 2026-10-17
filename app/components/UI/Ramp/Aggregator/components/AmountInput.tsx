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
import { getFontSizeForInputLength } from '../../Views/BuildQuote/getFontSizeForInputLength';

const DEFAULT_AMOUNT_FONT_SIZE = 24;
const DEFAULT_AMOUNT_LINE_HEIGHT = 32;

const styles = StyleSheet.create({
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

export const getAggregatorAmountFontSize = (contentLength: number): number =>
  Math.min(DEFAULT_AMOUNT_FONT_SIZE, getFontSizeForInputLength(contentLength));

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
  const tokenSuffix = tokenSymbol ? ` ${tokenSymbol}` : undefined;
  const amountWithoutTokenSymbol = tokenSymbol
    ? amount.endsWith(` ${tokenSymbol}`)
      ? amount.slice(0, -` ${tokenSymbol}`.length)
      : amount.replace(tokenSymbol, '').trimEnd()
    : amount;
  const amountContentLength = tokenSuffix
    ? `${amountWithoutTokenSymbol}${tokenSuffix}`.length
    : `${currencySymbol ?? ''}${amount}`.length;
  const amountFontSize = getAggregatorAmountFontSize(amountContentLength);
  const amountStyle = [
    {
      color: highlightedError ? colors.error.default : colors.text.default,
      fontSize: amountFontSize,
      lineHeight: Math.min(DEFAULT_AMOUNT_LINE_HEIGHT, amountFontSize + 10),
    },
  ];

  const renderAmountContent = () => {
    if (loading) {
      return <SkeletonText medium />;
    }

    if (highlighted) {
      if (tokenSuffix) {
        return (
          <AnimatedAmountDisplay
            containerStyle={styles.amountWithCursor}
            cursor={{
              testID: BuildQuoteSelectors.AMOUNT_INPUT_CURSOR,
              style: [
                styles.cursor,
                { height: amountFontSize },
                { backgroundColor: colors.primary.default },
              ],
            }}
            style={amountStyle}
            suffix={tokenSuffix}
            value={amountWithoutTokenSymbol}
          />
        );
      }

      return (
        <AnimatedAmountDisplay
          containerStyle={styles.amountWithCursor}
          cursor={{
            testID: BuildQuoteSelectors.AMOUNT_INPUT_CURSOR,
            style: [
              styles.cursor,
              { height: amountFontSize },
              { backgroundColor: colors.primary.default },
            ],
          }}
          prefix={currencySymbol}
          style={amountStyle}
          value={amount}
        />
      );
    }

    return (
      <AnimatedAmountDisplay
        prefix={currencySymbol}
        style={amountStyle}
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
