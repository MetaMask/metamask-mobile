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
  const { isUnsupportedChain } = useQuickBuyContext();

  if (isUnsupportedChain) {
    return (
      <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.quick_buy.unsupported_chain')}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <QuickBuyToolbar />
      <AnimatedScrollView
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
