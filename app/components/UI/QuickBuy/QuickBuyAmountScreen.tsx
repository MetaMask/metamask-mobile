import React from 'react';
import {
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import QuickBuyAmount from './QuickBuyAmount';
import QuickBuyActionFooter from './components/QuickBuyActionFooter';
import QuickBuyDisabledSection from './components/QuickBuyDisabledSection';
import QuickBuyKeypad from './components/QuickBuyKeypad';
import QuickBuyToolbar from './components/QuickBuyToolbar';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * Default amount-first buy layout (Figma Swap For You).
 */
const QuickBuyAmountScreen: React.FC = () => {
  const { isUnsupportedChain, hasNoPayWithFunds } = useQuickBuyContext();

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
      {/* The toolbar stays live even with no funds — it owns the close button,
          so dimming it would leave the user with no way out of the sheet. */}
      <QuickBuyToolbar />
      <QuickBuyDisabledSection isDisabled={hasNoPayWithFunds}>
        <Box testID="quick-buy-amount-container">
          <QuickBuyAmount />
        </Box>
      </QuickBuyDisabledSection>
      <QuickBuyActionFooter />
      <QuickBuyKeypad />
    </>
  );
};

export default QuickBuyAmountScreen;
