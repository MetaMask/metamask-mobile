import React, { useMemo } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  Box as MmdsBox,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  AnimatedAmountDisplay,
  getFontSizeForInputLength,
} from '../../../../../component-library/components-temp/AnimatedAmountDisplay';
import Box from './Box';
import SkeletonText from './SkeletonText';
import DownChevronText from './DownChevronText';
import { BuildQuoteSelectors } from '../Views/BuildQuote/BuildQuote.testIds';
import { useTheme } from '../../../../../util/theme';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import Text, {
  TextColor as LegacyTextColor,
  TextVariant as LegacyTextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useBlinkingCursor } from '../../hooks/useBlinkingCursor';

const DEFAULT_AMOUNT_FONT_SIZE = 24;
const DEFAULT_AMOUNT_LINE_HEIGHT = 32;

const styles = StyleSheet.create({
  amount: {
    fontSize: DEFAULT_AMOUNT_FONT_SIZE,
    lineHeight: DEFAULT_AMOUNT_LINE_HEIGHT,
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
  const hardwareTier = useMemo(() => getHardwareTier(), []);
  const networkTier = useNetworkTier();
  const amountAnimationEnabled = !(
    hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR'
  );
  const cursorOpacity = useBlinkingCursor(highlighted && Boolean(tokenSymbol));
  const amountContentLength = `${currencySymbol ?? ''}${amount}`.length;
  const amountFontSize = getAggregatorAmountFontSize(amountContentLength);
  const amountStyle = {
    fontSize: amountFontSize,
    lineHeight: Math.min(
      DEFAULT_AMOUNT_LINE_HEIGHT,
      amountFontSize + (DEFAULT_AMOUNT_LINE_HEIGHT - DEFAULT_AMOUNT_FONT_SIZE),
    ),
  };
  const amountColor = highlightedError
    ? TextColor.ErrorDefault
    : TextColor.TextDefault;

  const renderAmountContent = () => {
    if (loading) {
      return <SkeletonText medium />;
    }

    if (tokenSymbol) {
      const textColor = highlightedError
        ? LegacyTextColor.Error
        : LegacyTextColor.Default;

      if (highlighted) {
        const suffix = ` ${tokenSymbol}`;
        const amountWithoutSymbol = amount.endsWith(suffix)
          ? amount.slice(0, -suffix.length)
          : amount.replace(tokenSymbol, '').trimEnd();

        return (
          <View style={styles.amountWithCursor}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.amount}
              variant={LegacyTextVariant.BodyMDMedium}
              color={textColor}
            >
              {amountWithoutSymbol}
            </Text>
            <Animated.View
              style={[
                styles.cursor,
                {
                  backgroundColor: colors.primary.default,
                  opacity: cursorOpacity,
                },
              ]}
              testID={BuildQuoteSelectors.AMOUNT_INPUT_CURSOR}
            />
            <Text
              style={styles.amount}
              variant={LegacyTextVariant.BodyMDMedium}
              color={textColor}
            >
              {' '}
              {tokenSymbol}
            </Text>
          </View>
        );
      }

      return (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.amount}
          variant={LegacyTextVariant.BodyMDMedium}
          color={textColor}
        >
          {amount}
        </Text>
      );
    }

    return (
      <AnimatedAmountDisplay
        accessible={false}
        animated={amountAnimationEnabled}
        color={amountColor}
        containerStyle={styles.amountWithCursor}
        cursor={
          highlighted
            ? {
                animated: amountAnimationEnabled,
                testID: BuildQuoteSelectors.AMOUNT_INPUT_CURSOR,
                style: [
                  styles.cursor,
                  {
                    backgroundColor: colors.primary.default,
                    height: amountFontSize,
                  },
                ],
              }
            : false
        }
        fontWeight={FontWeight.Medium}
        prefix={currencySymbol}
        style={amountStyle}
        value={amount}
        variant={TextVariant.BodyMd}
      />
    );
  };

  return (
    <Box label={label} highlighted={highlighted} compact>
      <MmdsBox
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        paddingHorizontal={4}
        paddingVertical={3}
      >
        <MmdsBox twClassName="min-w-0 flex-1">
          <TouchableOpacity
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${currencySymbol || ''}${amount}`}
            disabled={loading}
            onPress={onPress}
            hitSlop={{ top: 20, left: 20, right: 20, bottom: 20 }}
            testID={BuildQuoteSelectors.AMOUNT_INPUT}
          >
            {renderAmountContent()}
          </TouchableOpacity>
        </MmdsBox>

        {onCurrencyPress ? (
          <MmdsBox marginLeft={2}>
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
          </MmdsBox>
        ) : null}
      </MmdsBox>
    </Box>
  );
};

export default AmountInput;
