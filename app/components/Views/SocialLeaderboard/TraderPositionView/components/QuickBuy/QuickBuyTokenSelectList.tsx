import {
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import QuickBuyPayWithChainFilter from './components/QuickBuyPayWithChainFilter';

const styles = StyleSheet.create({
  tokenList: {
    flex: 1,
  },
});
import QuickBuyPayWithRow from './components/QuickBuyPayWithRow';
import { useChainDisplayInfos } from './hooks/useChainDisplayInfos';
import { getTokenKey } from './tokenKey';

export interface QuickBuyTokenSelectListProps {
  /** Header title (e.g. "Pay with" or "Receive"). */
  title: string;
  /** Copy shown when there are no tokens to choose from. */
  emptyLabel: string;
  /** Tokens to render as selectable rows. */
  tokens: BridgeToken[];
  /** Currently selected token (highlighted in the list). */
  selectedToken?: BridgeToken;
  /** Called when the user taps a token row. */
  onSelect: (token: BridgeToken) => void;
  /** Called when the user taps the header back button. */
  onBack: () => void;
  /** Chain to pre-select in the chain filter (null = "All"). */
  defaultChainId?: string | null;
  /**
   * Chain to surface first in the filter pills (right after "All"). Used to
   * promote the currently viewed token's network. Ignored when no token is held
   * on that chain.
   */
  priorityChainId?: string | null;
}

/**
 * Presentational token-list screen shared by the QuickBuy "Pay with" (buy) and
 * "Receive" (sell) flows: a header, an optional per-chain filter, and a
 * scrollable list of token rows. It owns no business logic — the surrounding
 * screen supplies the tokens, selection, labels, and handlers.
 */
const QuickBuyTokenSelectList: React.FC<QuickBuyTokenSelectListProps> = ({
  title,
  emptyLabel,
  tokens,
  selectedToken,
  onSelect,
  onBack,
  defaultChainId = null,
  priorityChainId = null,
}) => {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(
    defaultChainId,
  );

  const uniqueChainIds = useMemo(() => {
    const ids: string[] = [...new Set(tokens.map((token) => token.chainId))];
    if (priorityChainId === null || !ids.includes(priorityChainId)) {
      return ids;
    }
    return [priorityChainId, ...ids.filter((id) => id !== priorityChainId)];
  }, [tokens, priorityChainId]);

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
    if (selectedChainId === null) return tokens;
    return tokens.filter((token) => token.chainId === selectedChainId);
  }, [selectedChainId, tokens]);

  const selectedTokenKey = selectedToken
    ? getTokenKey(selectedToken)
    : undefined;

  const keyExtractor = useCallback(
    (token: BridgeToken) => getTokenKey(token),
    [],
  );

  const renderItem = useCallback(
    ({ item: token }: { item: BridgeToken }) => (
      <QuickBuyPayWithRow
        token={token}
        isSelected={getTokenKey(token) === selectedTokenKey}
        onPress={onSelect}
      />
    ),
    [onSelect, selectedTokenKey],
  );

  const renderEmpty = useCallback(
    () => (
      <Box
        twClassName="flex-1 px-4 py-8"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {emptyLabel}
        </Text>
      </Box>
    ),
    [emptyLabel],
  );

  return (
    <>
      <BottomSheetHeader
        onBack={onBack}
        backButtonProps={{ testID: 'quick-buy-pay-with-back' }}
        testID="quick-buy-pay-with-header"
      >
        <Text variant={TextVariant.HeadingSm}>{title}</Text>
      </BottomSheetHeader>

      {tokens.length === 0 ? (
        renderEmpty()
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
            renderEmpty()
          ) : (
            <FlashList
              style={styles.tokenList}
              data={filteredTokens}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="quick-buy-pay-with-scroll"
            />
          )}
        </>
      )}
    </>
  );
};

export default QuickBuyTokenSelectList;
