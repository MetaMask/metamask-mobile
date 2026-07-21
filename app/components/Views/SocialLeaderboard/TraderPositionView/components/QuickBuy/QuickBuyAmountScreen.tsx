import React from 'react';
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
      <Box twClassName="shrink" testID="quick-buy-amount-container">
        <QuickBuyAmount />
      </Box>
      <QuickBuyActionFooter />
    </>
  );
};

export default QuickBuyAmountScreen;
