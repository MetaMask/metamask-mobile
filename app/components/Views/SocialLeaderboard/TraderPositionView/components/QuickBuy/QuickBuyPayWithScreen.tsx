import React, { useCallback } from 'react';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import {
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import QuickBuyPayWithRow from './components/QuickBuyPayWithRow';
import { getTokenKey } from './sourceTokenCandidates';
import { useQuickBuyContext } from './useQuickBuyContext';

const QuickBuyPayWithScreen: React.FC = () => {
  const {
    sourceTokenOptions,
    selectedSourceToken,
    handleSelectSourceToken,
    setActiveScreen,
  } = useQuickBuyContext();

  const handleBack = useCallback(() => {
    setActiveScreen('amount');
  }, [setActiveScreen]);

  const handleTokenPress = useCallback(
    (token: Parameters<typeof handleSelectSourceToken>[0]) => {
      handleSelectSourceToken(token);
      setActiveScreen('amount');
    },
    [handleSelectSourceToken, setActiveScreen],
  );

  const selectedTokenKey = selectedSourceToken
    ? getTokenKey(selectedSourceToken)
    : undefined;

  return (
    <>
      <BottomSheetHeader onBack={handleBack} testID="quick-buy-pay-with-header">
        <Text variant={TextVariant.HeadingSm}>
          {strings('social_leaderboard.quick_buy.pay_with')}
        </Text>
      </BottomSheetHeader>

      {sourceTokenOptions.length === 0 ? (
        <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.quick_buy.pay_with_no_tokens')}
          </Text>
        </Box>
      ) : (
        <GestureHandlerScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="quick-buy-pay-with-scroll"
        >
          {sourceTokenOptions.map((token) => (
            <QuickBuyPayWithRow
              key={getTokenKey(token)}
              token={token}
              isSelected={getTokenKey(token) === selectedTokenKey}
              onPress={handleTokenPress}
            />
          ))}
        </GestureHandlerScrollView>
      )}
    </>
  );
};

export default QuickBuyPayWithScreen;
