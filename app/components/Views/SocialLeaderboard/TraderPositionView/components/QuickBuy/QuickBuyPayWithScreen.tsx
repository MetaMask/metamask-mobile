import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView as GestureHandlerScrollView } from 'react-native-gesture-handler';
import {
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import QuickBuyPayWithChainFilter from './components/QuickBuyPayWithChainFilter';
import QuickBuyPayWithRow from './components/QuickBuyPayWithRow';
import { useChainDisplayInfos } from './hooks/useChainDisplayInfos';
import { getTokenKey } from './sourceTokenCandidates';
import { useQuickBuyContext } from './useQuickBuyContext';
import { chainNameToId } from '../../../utils/chainMapping';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import type { BridgeToken } from '../../../../../UI/Bridge/types';

const QuickBuyPayWithScreen: React.FC = () => {
  const tw = useTailwind();
  const {
    tradeMode,
    target,
    sourceTokenOptions,
    selectedSourceToken,
    handleSelectSourceToken,
    sellDestTokenOptions,
    selectedDestStable,
    handleSelectDestStable,
    setActiveScreen,
  } = useQuickBuyContext();

  const isSellMode = tradeMode === 'sell';

  // Choose the token list depending on mode.
  const tokenList: BridgeToken[] = isSellMode
    ? sellDestTokenOptions
    : sourceTokenOptions;

  // In sell mode, default to the position chain only when at least one
  // stablecoin candidate exists on it — avoids an immediately-empty list.
  const defaultChainId = useMemo(() => {
    if (!isSellMode) return null;
    const caip = chainNameToId(target.chain);
    if (!caip || isNonEvmChainId(caip)) return null;
    let hexChainId: string;
    try {
      hexChainId = formatChainIdToHex(caip);
    } catch {
      return null;
    }
    return tokenList.some((t) => t.chainId === hexChainId) ? hexChainId : null;
  }, [isSellMode, target.chain, tokenList]);

  const [selectedChainId, setSelectedChainId] = useState<string | null>(
    defaultChainId,
  );

  const selectedToken = isSellMode ? selectedDestStable : selectedSourceToken;

  const handleTokenSelect = useCallback(
    (token: BridgeToken) => {
      if (isSellMode) {
        handleSelectDestStable(token);
      } else {
        handleSelectSourceToken(token);
      }
      setActiveScreen('amount');
    },
    [
      isSellMode,
      handleSelectDestStable,
      handleSelectSourceToken,
      setActiveScreen,
    ],
  );

  const uniqueChainIds = useMemo(
    () => [...new Set(tokenList.map((token) => token.chainId))],
    [tokenList],
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
    if (selectedChainId === null) return tokenList;
    return tokenList.filter((token) => token.chainId === selectedChainId);
  }, [selectedChainId, tokenList]);

  const handleBack = useCallback(() => {
    setActiveScreen('amount');
  }, [setActiveScreen]);

  const selectedTokenKey = selectedToken
    ? getTokenKey(selectedToken)
    : undefined;

  const title = isSellMode
    ? strings('social_leaderboard.quick_buy.receive_with')
    : strings('social_leaderboard.quick_buy.pay_with');

  const emptyLabel = isSellMode
    ? strings('social_leaderboard.quick_buy.receive_with_no_tokens')
    : strings('social_leaderboard.quick_buy.pay_with_no_tokens');

  return (
    <>
      <BottomSheetHeader
        onBack={handleBack}
        backButtonProps={{ testID: 'quick-buy-pay-with-back' }}
        testID="quick-buy-pay-with-header"
      >
        <Text variant={TextVariant.HeadingSm}>{title}</Text>
      </BottomSheetHeader>

      {tokenList.length === 0 ? (
        <Box
          twClassName="flex-1 px-4 py-8"
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {emptyLabel}
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
            <Box
              twClassName="flex-1 px-4 py-8"
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {emptyLabel}
              </Text>
            </Box>
          ) : (
            <GestureHandlerScrollView
              style={tw.style('flex-1')}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="quick-buy-pay-with-scroll"
            >
              {filteredTokens.map((token) => (
                <QuickBuyPayWithRow
                  key={getTokenKey(token)}
                  token={token}
                  isSelected={getTokenKey(token) === selectedTokenKey}
                  onPress={handleTokenSelect}
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
