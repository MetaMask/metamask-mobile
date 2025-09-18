import React, { useCallback, useMemo, useRef } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Box } from '../../Box/Box';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Icon, {
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { IconSize } from '../../../../component-library/components/Icons/Icon/Icon.types';
import { strings } from '../../../../../locales/i18n';
import { FlexDirection, AlignItems, JustifyContent } from '../../Box/box.types';
import { useTokenSearch } from '../hooks/useTokenSearch';
import TextFieldSearch from '../../../../component-library/components/Form/TextFieldSearch';
import { BridgeToken } from '../types';
import { Skeleton } from '../../../../component-library/components/Skeleton';
import { useAssetMetadata } from '../hooks/useAssetMetadata';
import { CaipChainId, Hex } from '@metamask/utils';
// We use ReusableModal instead of BottomSheet to prevent the keyboard from pushing the search input off screen
import ReusableModal, { ReusableModalRef } from '../../ReusableModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { FlatList } from 'react-native-gesture-handler';

// FlashList cannot scroll on Android here, so we use FlatList
const ListComponent = Platform.OS === 'ios' ? FlashList : FlatList;

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      position: 'absolute',
      right: 0,
    },
    closeIconBox: {
      padding: 8,
    },
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
    // This section is so we can use ReusableModal styled like BottomSheet
    content: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    screen: { justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: theme.colors.background.default,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    notch: {
      width: 48,
      height: 5,
      borderRadius: 4,
      backgroundColor: theme.colors.border.default,
      marginTop: 8,
      alignSelf: 'center',
    },
    // End section
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
    <Box style={styles.loadingSkeleton} gap={20}>
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
  tokensList: BridgeToken[];
  pending?: boolean;
  chainIdToFetchMetadata?: Hex | CaipChainId;
  title?: string;
}

export const BridgeTokenSelectorBase: React.FC<
  BridgeTokenSelectorBaseProps
> = ({
  networksBar,
  renderTokenItem,
  tokensList,
  pending,
  chainIdToFetchMetadata: chainId,
  title,
}) => {
  const { styles, theme } = useStyles(createStyles, {});
  const safeAreaInsets = useSafeAreaInsets();
  const {
    searchString,
    setSearchString,
    searchResults,
    debouncedSearchString,
  } = useTokenSearch({
    tokens: tokensList || [],
  });

  const {
    assetMetadata: unlistedAssetMetadata,
    pending: unlistedAssetMetadataPending,
  } = useAssetMetadata(
    debouncedSearchString,
    Boolean(debouncedSearchString && searchResults.length === 0),
    chainId,
  );

  const tokensToRender = useMemo(() => {
    if (!searchString) {
      return tokensList;
    }

    if (searchResults.length > 0) {
      return searchResults;
    }

    return unlistedAssetMetadata ? [unlistedAssetMetadata] : [];
  }, [searchString, searchResults, tokensList, unlistedAssetMetadata]);

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

  const modalRef = useRef<ReusableModalRef>(null);
  const dismissModal = (): void => {
    modalRef.current?.dismissModal();
  };

  const shouldRenderOverallLoading = useMemo(
    () => (pending && tokensList?.length === 0) || unlistedAssetMetadataPending,
    [pending, unlistedAssetMetadataPending, tokensList],
  );

  // We show the tokens with balance immediately, but we need to wait for the top tokens to load
  // So we show a few skeletons for the top tokens
  const tokensToRenderWithSkeletons: (BridgeToken | null)[] = useMemo(() => {
    if (pending && tokensToRender?.length > 0) {
      return [...tokensToRender, ...Array(4).fill(null)];
    }

    return tokensToRender;
  }, [pending, tokensToRender]);

  return (
    <ReusableModal
      ref={modalRef}
      style={[styles.screen, { marginTop: safeAreaInsets.top }]}
    >
      <Box
        style={[
          styles.content,
          styles.sheet,
          { paddingBottom: safeAreaInsets.bottom },
        ]}
      >
        <Box style={styles.notch} />

        {/* Header */}
        <Box gap={4}>
          <BottomSheetHeader>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
            >
              <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
                {title ?? strings('bridge.select_token')}
              </Text>
              <Box style={[styles.closeButton, styles.closeIconBox]}>
                <TouchableOpacity
                  onPress={dismissModal}
                  testID="bridge-token-selector-close-button"
                >
                  <Icon
                    name={IconName.Close}
                    color={theme.colors.icon.default}
                    size={IconSize.Lg}
                  />
                </TouchableOpacity>
              </Box>
            </Box>
          </BottomSheetHeader>
        </Box>

        {/* Search + networks */}
        <Box style={styles.buttonContainer} gap={20}>
          {networksBar}

          <TextFieldSearch
            value={searchString}
            onChangeText={handleSearchTextChange}
            placeholder={strings('swaps.search_token')}
            testID="bridge-token-search-input"
          />
        </Box>

        {/* TODO put in 20 gap below as well, but it's not working */}

        {/* Tokens */}
        <ListComponent
          data={shouldRenderOverallLoading ? [] : tokensToRenderWithSkeletons}
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
        />
      </Box>
    </ReusableModal>
  );
};
