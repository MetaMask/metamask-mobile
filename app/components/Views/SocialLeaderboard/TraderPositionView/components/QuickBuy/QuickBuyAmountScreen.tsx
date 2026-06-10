import React from 'react';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import QuickBuyAmount from './QuickBuyAmount';
import QuickBuyActionFooter from './components/QuickBuyActionFooter';
import QuickBuyToolbar from './components/QuickBuyToolbar';
import { useQuickBuyContext } from './useQuickBuyContext';

const AnimatedScrollView = Animated.createAnimatedComponent(
  GestureHandlerScrollView,
);

/**
 * Default amount-first buy layout (Figma Swap For You).
 */
const QuickBuyAmountScreen: React.FC = () => {
  const tw = useTailwind();
  const { isUnsupportedChain, isDestTokenUnavailable } = useQuickBuyContext();

  // Both states are terminal for this sheet: without a supported chain and a
  // resolved destination token, quotes can never be fetched. Replace the buy
  // flow with an explicit message instead of leaving the Buy button silently
  // disabled with no feedback (TSA-659).
  if (isUnsupportedChain || isDestTokenUnavailable) {
    return (
      <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings(
            isUnsupportedChain
              ? 'social_leaderboard.quick_buy.unsupported_chain'
              : 'social_leaderboard.quick_buy.token_unavailable',
          )}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <QuickBuyToolbar />
      <AnimatedScrollView
        style={tw.style('shrink')}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <QuickBuyAmount />
      </AnimatedScrollView>
      <QuickBuyActionFooter />
    </>
  );
};

export default QuickBuyAmountScreen;
