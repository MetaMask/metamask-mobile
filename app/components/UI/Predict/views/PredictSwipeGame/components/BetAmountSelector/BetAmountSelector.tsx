import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, ScrollView } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../../../util/theme';
import {
  BET_AMOUNTS,
  BET_LIMITS,
  SWIPE_GAME_TEST_IDS,
} from '../../PredictSwipeGame.constants';

interface BetAmountSelectorProps {
  currentAmount: number;
  balance: number;
  onAmountChange: (amount: number) => void;
  disabled?: boolean;
}

/**
 * BetAmountSelector - Quick bet amount selection at the top of the screen
 *
 * Features:
 * - Shows current bet amount prominently
 * - Quick preset buttons for common amounts
 * - Indicates when amount exceeds balance
 */
export const BetAmountSelector: React.FC<BetAmountSelectorProps> = ({
  currentAmount,
  balance,
  onAmountChange,
  disabled = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const isOverBalance = currentAmount > balance;
  const hasInsufficientBalance = balance < BET_LIMITS.MIN;

  return (
    <Box
      twClassName="w-full px-4 pt-2 pb-3"
      testID={SWIPE_GAME_TEST_IDS.BET_AMOUNT_SELECTOR}
    >
      {/* Current bet amount display */}
      <Box twClassName="items-center mb-3">
        <Text variant={TextVariant.BodySm} twClassName="text-muted mb-1">
          Bet Amount
        </Text>
        <Text
          variant={TextVariant.HeadingLg}
          fontWeight={FontWeight.Bold}
          style={isOverBalance ? { color: colors.error.default } : undefined}
        >
          ${currentAmount}
        </Text>
        {isOverBalance && (
          <Text
            variant={TextVariant.BodySm}
            style={{ color: colors.error.default }}
          >
            Exceeds balance (${balance.toFixed(2)})
          </Text>
        )}
        {hasInsufficientBalance && (
          <Text
            variant={TextVariant.BodySm}
            style={{ color: colors.error.default }}
          >
            Add funds to bet
          </Text>
        )}
      </Box>

      {/* Preset amount buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetContainer}
      >
        {BET_AMOUNTS.map((amount) => {
          const isSelected = amount === currentAmount;
          const isDisabled = disabled || amount > balance;

          return (
            <Pressable
              key={amount}
              onPress={() => !isDisabled && onAmountChange(amount)}
              disabled={isDisabled}
              style={({ pressed }) => [
                styles.presetButton,
                isSelected && {
                  backgroundColor: colors.primary.default,
                },
                !isSelected && {
                  backgroundColor: colors.background.alternative,
                  borderWidth: 1,
                  borderColor: colors.border.muted,
                },
                isDisabled && { opacity: 0.4 },
                pressed && !isDisabled && { opacity: 0.7 },
              ]}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={isSelected ? FontWeight.Bold : FontWeight.Medium}
                style={
                  isSelected
                    ? { color: colors.primary.inverse }
                    : { color: colors.text.default }
                }
              >
                ${amount}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Balance indicator */}
      <Box twClassName="items-center mt-2">
        <Text variant={TextVariant.BodySm} twClassName="text-muted">
          Balance: ${balance.toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  presetContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 56,
    alignItems: 'center',
  },
});

export default BetAmountSelector;

