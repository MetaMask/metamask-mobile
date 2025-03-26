import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Box } from '../../Box/Box';
import Text, { TextVariant, TextColor } from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet, { BottomSheetRef } from '../../../../component-library/components/BottomSheets/BottomSheet';
import Icon, { IconName } from '../../../../component-library/components/Icons/Icon';
import { IconSize } from '../../../../component-library/components/Icons/Icon/Icon.types';
import { strings } from '../../../../../locales/i18n';
import { FlexDirection, AlignItems, JustifyContent } from '../../Box/box.types';
import { useTokenSearch } from '../hooks/useTokenSearch';
import TextFieldSearch from '../../../../component-library/components/Form/TextFieldSearch';
import { BridgeToken } from '../types';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
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
  });
};

interface BridgeTokenSelectorBaseProps {
  networksBar: React.ReactNode;
  renderTokenItem: ({ item }: { item: BridgeToken }) => React.JSX.Element;
  tokensList: BridgeToken[];
}

export const BridgeTokenSelectorBase: React.FC<BridgeTokenSelectorBaseProps> = ({
  networksBar,
  renderTokenItem,
  tokensList,
}) => {
  const { styles, theme } = useStyles(createStyles, {});
  const { searchString, setSearchString, searchResults } = useTokenSearch({
    tokens: tokensList || [],
  });
  const tokensToRender = useMemo(() =>
    searchString ? searchResults : tokensList,
    [searchString, searchResults, tokensList]
  );

  const keyExtractor = useCallback((token: BridgeToken) => `${token.chainId}-${token.address}`, []);

  const handleSearchTextChange = useCallback((text: string) => {
    setSearchString(text);
  }, [setSearchString]);

  const renderEmptyList = useMemo(
    () => (
      <Box style={styles.emptyList}>
        <Text color={TextColor.Alternative}>
          {strings('swaps.no_tokens_result', { searchString })}
        </Text>
      </Box>
    ),
    [searchString, styles],
  );

  const modalRef = useRef<BottomSheetRef>(null);
  const dismissModal = (): void => {
    modalRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet
      isFullscreen
      ref={modalRef}
    >
      <Box style={styles.content}>
        <Box gap={4}>
          <BottomSheetHeader>
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
            >
              <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
                {strings('bridge.select_token')}
              </Text>
              <Box style={[styles.closeButton, styles.closeIconBox]}>
                <TouchableOpacity
                  onPress={dismissModal}
                  testID="bridge-token-selector-close-button"
                >
                  <Icon
                    name={IconName.Close}
                    size={IconSize.Sm}
                    color={theme.colors.icon.default}
                  />
                </TouchableOpacity>
              </Box>
            </Box>
          </BottomSheetHeader>
        </Box>

        <Box style={styles.buttonContainer} gap={16}>
          {networksBar}

          <TextFieldSearch
            value={searchString}
            onChangeText={handleSearchTextChange}
            placeholder={strings('swaps.search_token')}
            testID="bridge-token-search-input"
            />
        </Box>

        <FlatList
          data={tokensToRender}
          renderItem={renderTokenItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={renderEmptyList}
        />
      </Box>
    </BottomSheet>
  );
};
