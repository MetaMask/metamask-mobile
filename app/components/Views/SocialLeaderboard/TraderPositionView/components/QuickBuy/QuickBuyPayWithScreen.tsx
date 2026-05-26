import React, { useCallback, useMemo, useState } from 'react';
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
import QuickBuyPayWithChainFilter from './components/QuickBuyPayWithChainFilter';
import QuickBuyPayWithRow from './components/QuickBuyPayWithRow';
import { useChainDisplayInfos } from './hooks/useChainDisplayInfos';
import { getTokenKey } from './sourceTokenCandidates';
import { useQuickBuyContext } from './useQuickBuyContext';

const QuickBuyPayWithScreen: React.FC = () => {
  const {
    sourceTokenOptions,
    selectedSourceToken,
    handleSelectSourceToken,
    setActiveScreen,
  } = useQuickBuyContext();
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);

  const uniqueChainIds = useMemo(
    () => [...new Set(sourceTokenOptions.map((token) => token.chainId))],
    [sourceTokenOptions],
  );

  const chainDisplayInfos = useChainDisplayInfos(uniqueChainIds);

  const filterChains = useMemo(
    () => [
      {
        chainId: null,
        name: strings('social_leaderboard.quick_buy.pay_with_filter_all'),
        imageSource: undefined,
      },
      ...chainDisplayInfos,
    ],
    [chainDisplayInfos],
  );

  const showChainFilter = uniqueChainIds.length > 1;

  const filteredTokens = useMemo(() => {
    if (selectedChainId === null) {
      return sourceTokenOptions;
    }

    return sourceTokenOptions.filter(
      (token) => token.chainId === selectedChainId,
    );
  }, [selectedChainId, sourceTokenOptions]);

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
      <BottomSheetHeader
        onBack={handleBack}
        backButtonProps={{ testID: 'quick-buy-pay-with-back' }}
        testID="quick-buy-pay-with-header"
      >
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
        <>
          {showChainFilter ? (
            <QuickBuyPayWithChainFilter
              chains={filterChains}
              selectedChainId={selectedChainId}
              onSelect={setSelectedChainId}
            />
          ) : null}

          {filteredTokens.length === 0 ? (
            <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('social_leaderboard.quick_buy.pay_with_no_tokens')}
              </Text>
            </Box>
          ) : (
            <GestureHandlerScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="quick-buy-pay-with-scroll"
            >
              {filteredTokens.map((token) => (
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
      )}
    </>
  );
};

export default QuickBuyPayWithScreen;
