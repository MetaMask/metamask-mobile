import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Box } from '../../Box/Box';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../locales/i18n';
import { FlexDirection, AlignItems } from '../../Box/box.types';
import { useTokenSearch } from '../hooks/useTokenSearch';
import TextFieldSearch from '../../../../component-library/components/Form/TextFieldSearch';
import { BridgeToken } from '../types';
import { Skeleton } from '../../../../component-library/components/Skeleton';
import { useAssetMetadata } from '../hooks/useAssetMetadata';
import { CaipChainId, Hex } from '@metamask/utils';
import { FlatList } from 'react-native-gesture-handler';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';

// FlashList on iOS had some issues so we use FlatList for both platforms now
const ListComponent = FlatList;

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    emptyList: {
      marginVertical: 10,
      marginHorizontal: 24,
    },
    networksButton: {
      borderColor: theme.colors.border.muted,
    },
    buttonContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    loadingSkeleton: {
      padding: 16,
    },
    skeletonCircle: {
      borderRadius: 15,
    },
    skeletonItemContainer: {
      paddingLeft: 18,
      paddingRight: 10,
      paddingVertical: 12,
    },
    // Need the flex 1 to make sure this doesn't disappear when FlexDirection.Row is used
    skeletonItemRows: {
      flex: 1,
    },
  });
};

export const SkeletonItem = () => {
  const { styles } = useStyles(createStyles, {});

  return (
    <Box
      gap={16}
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      style={styles.skeletonItemContainer}
    >
      <Skeleton height={30} width={30} style={styles.skeletonCircle} />

      <Box gap={4} style={styles.skeletonItemRows}>
        <Skeleton height={24} width={'96%'} />
        <Skeleton height={24} width={'37%'} />
      </Box>
    </Box>
  );
};

export const LoadingSkeleton = () => {
  const { styles } = useStyles(createStyles, {});

  return (
    <Box style={styles.loadingSkeleton}>
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </Box>
  );
};

interface BridgeTokenSelectorBaseProps {
  networksBar: React.ReactNode;
  renderTokenItem: ({
    item,
  }: {
    item: BridgeToken | null;
  }) => React.JSX.Element;
  /**
   * All tokens that we can search through
   */
  allTokens: BridgeToken[];
  tokensToRender: BridgeToken[];
  /**
   * Tokens to render, a subset of allTokens to improve rendering performance
   */
  pending?: boolean;
  chainIdToFetchMetadata?: Hex | CaipChainId;
  title?: string;
  scrollResetKey?: string | Hex | CaipChainId;
}

export const BridgeTokenSelectorBase: React.FC<
  BridgeTokenSelectorBaseProps
> = ({
  networksBar,
  renderTokenItem,
  allTokens,
  tokensToRender,
  pending,
  chainIdToFetchMetadata: chainId,
  title,
  scrollResetKey,
}) => {
  const { styles } = useStyles(createStyles, {});
  const {
    searchString,
    setSearchString,
    searchResults,
    debouncedSearchString,
  } = useTokenSearch({
    tokens: allTokens || [],
  });

  const {
    assetMetadata: unlistedAssetMetadata,
    pending: unlistedAssetMetadataPending,
  } = useAssetMetadata(
    debouncedSearchString,
    Boolean(debouncedSearchString && searchResults.length === 0),
    chainId,
  );

  const tokensToRenderWithSearch = useMemo(() => {
    if (!searchString) {
      return tokensToRender;
    }

    if (searchResults.length > 0) {
      return searchResults;
    }

    return unlistedAssetMetadata ? [unlistedAssetMetadata] : [];
  }, [searchString, searchResults, tokensToRender, unlistedAssetMetadata]);

  const keyExtractor = useCallback(
    (token: BridgeToken | null, index: number) =>
      token ? `${token.chainId}-${token.address}` : `skeleton-${index}`,
    [],
  );

  const handleSearchTextChange = useCallback(
    (text: string) => {
      setSearchString(text);
    },
    [setSearchString],
  );

  const renderEmptyList = useMemo(
    () => (
      <Box style={styles.emptyList}>
        <Text color={TextColor.Alternative}>
          {strings('swaps.no_tokens_result', {
            searchString: debouncedSearchString,
          })}
        </Text>
      </Box>
    ),
    [debouncedSearchString, styles],
  );

  const sheetRef = useRef<BottomSheetRef>(null);
  const dismissModal = (): void => {
    sheetRef.current?.onCloseBottomSheet();
  };

  const shouldRenderOverallLoading = useMemo(
    () => (pending && allTokens?.length === 0) || unlistedAssetMetadataPending,
    [pending, unlistedAssetMetadataPending, allTokens],
  );

  // We show the tokens with balance immediately, but we need to wait for the top tokens to load
  // So we show a few skeletons for the top tokens
  const tokensToRenderWithSearchAndSkeletons: (BridgeToken | null)[] =
    useMemo(() => {
      if (pending && tokensToRenderWithSearch?.length > 0) {
        return [...tokensToRenderWithSearch, ...Array(4).fill(null)];
      }

      return tokensToRenderWithSearch;
    }, [pending, tokensToRenderWithSearch]);

  return (
    <BottomSheet
      ref={sheetRef}
      isFullscreen
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={dismissModal}
        closeButtonProps={{ testID: 'bridge-token-selector-close-button' }}
      >
        <Text variant={TextVariant.HeadingMD}>
          {title ?? strings('bridge.select_token')}
        </Text>
      </BottomSheetHeader>

      <Box style={styles.buttonContainer} gap={16}>
        {networksBar}

        <TextFieldSearch
          value={searchString}
          onChangeText={handleSearchTextChange}
          placeholder={strings('swaps.search_token')}
          testID="bridge-token-search-input"
        />
      </Box>

      <ListComponent
        key={scrollResetKey}
        data={
          shouldRenderOverallLoading ? [] : tokensToRenderWithSearchAndSkeletons
        }
        renderItem={renderTokenItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          debouncedSearchString && !shouldRenderOverallLoading
            ? renderEmptyList
            : LoadingSkeleton
        }
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator={false}
        bounces
        scrollEnabled
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={20}
      />
    </BottomSheet>
  );
};
