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
import { QuickBuySheetSelectorsIDs } from './QuickBuySheet.testIds';
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
      <QuickBuyDisabledSection
        isDisabled={hasNoPayWithFunds}
        testID="quick-buy-disabled-amount"
      >
        <Box testID={QuickBuySheetSelectorsIDs.AMOUNT_CONTAINER}>
          <QuickBuyAmount />
        </Box>
      </QuickBuyDisabledSection>
      <QuickBuyActionFooter />
      {/* The keypad stays mounted and expanded whether or not the user has funds
          — collapsing it would make the sheet height depend on a flag that is
          not settled on first render, which flashed. It is dimmed and inert
          instead, so its digit keys cannot type into a dead amount field. */}
      <QuickBuyDisabledSection
        isDisabled={hasNoPayWithFunds}
        testID="quick-buy-disabled-keypad"
      >
        <QuickBuyKeypad />
      </QuickBuyDisabledSection>
    </>
  );
};

export default QuickBuyAmountScreen;
