import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Box } from '../../Box/Box';
import Text, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import HeaderCompactStandard from '../../../../component-library/components-temp/HeaderCompactStandard';
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
    tokensList: {
      marginTop: 10,
      flex: 1,
    },
    tokensListContent: {
      paddingBottom: 0,
    },
    tokensListContainer: {
      flex: 1,
    },
    searchInput: {
      borderRadius: 12,
      borderWidth: 0,
      backgroundColor: theme.colors.background.section,
    },
  });
};

export const SkeletonItem = React.memo(() => {
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
});

export const LoadingSkeleton = React.memo(() => {
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
});

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

export const BridgeTokenSelectorBase: React.FC<BridgeTokenSelectorBaseProps> =
  React.memo(
    ({
      networksBar,
      renderTokenItem,
      allTokens,
      tokensToRender,
      pending,
      chainIdToFetchMetadata: chainId,
      title,
      scrollResetKey,
    }) => {
      const { styles, theme } = useStyles(createStyles);
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
      const dismissModal = useCallback((): void => {
        sheetRef.current?.onCloseBottomSheet();
      }, []);

      const shouldRenderOverallLoading = useMemo(
        () =>
          (pending && allTokens?.length === 0) || unlistedAssetMetadataPending,
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

      const placeholderTextColor = theme.colors.text.alternative;

      return (
        <BottomSheet
          ref={sheetRef}
          isFullscreen
          keyboardAvoidingViewEnabled={false}
        >
          <HeaderCompactStandard
            title={title ?? strings('bridge.select_token')}
            onClose={dismissModal}
            closeButtonProps={{
              testID: 'bridge-token-selector-close-button',
            }}
          />

          <Box style={styles.buttonContainer} gap={20}>
            {networksBar}

            <TextFieldSearch
              value={searchString}
              onChangeText={handleSearchTextChange}
              placeholder={strings('swaps.search_token')}
              testID="bridge-token-search-input"
              style={styles.searchInput}
              placeholderTextColor={placeholderTextColor}
            />
          </Box>

          {/* Need this extra View to fix tokens not being reliably pressable on Android hardware, no idea why */}
          <View style={styles.tokensListContainer}>
            <ListComponent
              style={styles.tokensList}
              contentContainerStyle={styles.tokensListContent}
              key={scrollResetKey}
              data={
                shouldRenderOverallLoading
                  ? []
                  : tokensToRenderWithSearchAndSkeletons
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
              keyboardShouldPersistTaps="always"
            />
          </View>
        </BottomSheet>
      );
    },
  );
