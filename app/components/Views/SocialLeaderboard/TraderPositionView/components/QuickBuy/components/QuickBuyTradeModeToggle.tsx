import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useQuickBuyContext } from '../useQuickBuyContext';
import type { QuickBuyTradeMode } from '../types';

interface QuickBuyTradeModeToggleProps {
  testID?: string;
}

const QuickBuyTradeModeToggle: React.FC<QuickBuyTradeModeToggleProps> = ({
  testID = 'quick-buy-trade-mode-toggle',
}) => {
  const { tradeMode, setTradeMode, hasSellableBalance } = useQuickBuyContext();

  const handlePress = (mode: QuickBuyTradeMode) => {
    if (tradeMode !== mode) {
      setTradeMode(mode);
    }
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="border border-muted rounded-xl p-1"
      testID={testID}
    >
      <TouchableOpacity
        onPress={() => handlePress('buy')}
        accessibilityRole="button"
        accessibilityState={{ selected: tradeMode === 'buy' }}
        testID="quick-buy-trade-mode-buy"
      >
        <Box
          twClassName={`rounded-[10px] px-3 py-1 ${tradeMode === 'buy' ? 'bg-muted' : ''}`}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              tradeMode === 'buy' ? FontWeight.Medium : FontWeight.Regular
            }
            color={TextColor.TextDefault}
          >
            {strings('social_leaderboard.quick_buy.buy_label')}
          </Text>
        </Box>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress('sell')}
        disabled={!hasSellableBalance}
        accessibilityRole="button"
        accessibilityState={{
          selected: tradeMode === 'sell',
          disabled: !hasSellableBalance,
        }}
        testID="quick-buy-trade-mode-sell"
      >
        <Box
          twClassName={`rounded-[10px] px-3 py-1 ${tradeMode === 'sell' ? 'bg-muted' : ''} ${!hasSellableBalance ? 'opacity-40' : ''}`}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={
              tradeMode === 'sell' ? FontWeight.Medium : FontWeight.Regular
            }
            color={TextColor.TextDefault}
          >
            {strings('social_leaderboard.quick_buy.sell_label')}
          </Text>
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

export default QuickBuyTradeModeToggle;
