import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import type { FlashListRef } from '@shopify/flash-list';
import type { FlashListAssetKey } from '../../Tokens/TokenList/TokenList';
import { SCROLL_TO_TOKEN_EVENT } from '../../Tokens/constants';

const TOKEN_ROW_HEIGHT = 72;

interface UseTokenListScrollAfterClaimParams {
  listRef: React.RefObject<FlashListRef<FlashListAssetKey>>;
  displayTokenKeys: FlashListAssetKey[];
  isFullView: boolean;
}

/**
 * Listens for SCROLL_TO_TOKEN_EVENT (emitted after mUSD reward claims) and
 * scrolls the token list to the relevant token.
 *
 * Supports both FlashList (isFullView=true) and mapped-list modes.
 * In mapped-list mode, emits a `scrollToTokenIndex` event so the parent
 * ScrollView can handle the actual scroll offset.
 */
export const useTokenListScrollAfterClaim = ({
  listRef,
  displayTokenKeys,
  isFullView,
}: UseTokenListScrollAfterClaimParams): void => {
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      SCROLL_TO_TOKEN_EVENT,
      ({ address, chainId }: { address: string; chainId: string }) => {
        const tokenIndex = displayTokenKeys.findIndex(
          (item) =>
            item.address?.toLowerCase() === address?.toLowerCase() &&
            item.chainId === chainId,
        );

        if (tokenIndex === -1) {
          return;
        }

        if (isFullView) {
          listRef.current?.scrollToIndex({
            index: tokenIndex,
            animated: true,
            viewPosition: 0.5,
          });
        } else {
          // Approximate token row height is 72px; parent ScrollView handles the scroll
          DeviceEventEmitter.emit('scrollToTokenIndex', {
            index: tokenIndex,
            offset: tokenIndex * TOKEN_ROW_HEIGHT,
          });
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [displayTokenKeys, isFullView, listRef]);
};
