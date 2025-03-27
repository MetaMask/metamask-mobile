import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import type { Colors } from '../../../../../util/theme/models';
import CurrencyToggle from '../CurrencySwitch';
import { isStablecoinLendingFeatureEnabled } from '../../../Stake/constants';

export interface InputDisplayProps {
  isOverMaximum: {
    isOverMaximumEth: boolean;
    isOverMaximumToken: boolean;
  };
  balanceText: string;
  balanceValue: string;
  isNonZeroAmount: boolean;
  isFiat: boolean;
  ticker: string;
  amountToken: string;
  amountFiatNumber: string;
  currentCurrency: string;
  handleCurrencySwitch: () => void;
  currencyToggleValue: string;
}

const { View: AnimatedView } = Animated;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    inputContainer: {
      flex: 1,
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    amountRow: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    amountText: isStablecoinLendingFeatureEnabled()
      ? {
          fontSize: 40,
          lineHeight: 50,
          letterSpacing: 0,
          fontWeight: '500',
        }
      : {},
    amountCursor: {
      width: 1,
      height: 32,
      marginTop: 2,
      marginLeft: 5,
      marginRight: 5,
      opacity: 0.6,
      backgroundColor: colors.border.default,
    },
  });

const InputDisplay = ({
  isOverMaximum,
  balanceText,
  balanceValue,
  isFiat,
  ticker,
  amountToken,
  amountFiatNumber,
  currentCurrency,
  handleCurrencySwitch,
  currencyToggleValue,
}: InputDisplayProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const cursorOpacity = useRef(new Animated.Value(0.6)).current;
  const isStablecoinLendingEnabled = isStablecoinLendingFeatureEnabled();

  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 0.6,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );

    blinkAnimation.start();
  }, [cursorOpacity]);

  const getBalanceText = () => {
    if (isOverMaximum.isOverMaximumToken) {
      return strings('stake.not_enough_token', { ticker });
    }
    if (isOverMaximum.isOverMaximumEth) {
      return strings('stake.not_enough_eth');
    }
    if (isStablecoinLendingEnabled) return '\u00A0';
    return `${balanceText}: ${balanceValue}`;
  };

  const balanceInfo = getBalanceText();

  return (
    <View style={styles.inputContainer}>
      <View>
        <Text
          variant={TextVariant.BodySM}
          color={
            isOverMaximum.isOverMaximumToken || isOverMaximum.isOverMaximumEth
              ? TextColor.Error
              : undefined
          }
        >
          {balanceInfo}
        </Text>
      </View>
      <View style={styles.amountRow}>
        <Text
          style={styles.amountText}
          color={TextColor.Default}
          variant={TextVariant.DisplayMD}
        >
          {isFiat ? amountFiatNumber : amountToken}
        </Text>
        {isStablecoinLendingEnabled ? (
          <AnimatedView
            style={[styles.amountCursor, { opacity: cursorOpacity }]}
          />
        ) : null}
        <Text
          style={styles.amountText}
          color={TextColor.Muted}
          variant={TextVariant.DisplayMD}
        >
          {isFiat ? currentCurrency.toUpperCase() : ticker}
        </Text>
      </View>
      <View>
        <CurrencyToggle
          onPress={handleCurrencySwitch}
          value={currencyToggleValue}
        />
      </View>
    </View>
  );
};

export default InputDisplay;
