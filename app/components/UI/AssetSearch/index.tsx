import React, { memo, useEffect, useState, useCallback } from 'react';
import { TextInput, View, StyleSheet, Platform, TextStyle } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Fuse from 'fuse.js';
import { toLowerCaseEquals } from '../../../util/general';
import { useSelector } from 'react-redux';
import { TokenListToken } from '@metamask/assets-controllers';
import { useTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { TOKEN_INPUT_BOX_ID } from '../../../../wdio/screen-objects/testIDs/Screens/AssetSearch.testIds';
import { TokenViewSelectors } from '../../../../e2e/selectors/AddTokenView.selectors';
import { selectTokenListArray } from '../../../selectors/tokenListController';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    searchSection: {
      margin: 16,
      marginBottom: 0,
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.default,
      color: colors.text.default,
    },
    searchSectionFocused: {
      margin: 16,
      marginBottom: 0,
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      color: colors.text.default,
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    textInput: {
      ...fontStyles.normal,
      color: colors.text.default,
    } as TextStyle,
    icon: {
      paddingLeft: 20,
      color: colors.icon.alternative,
    },
    iconClose: {
      paddingRight: 20,
      color: colors.icon.alternative,
    },
    input: {
      width: '80%',
      paddingHorizontal: 12,
      paddingVertical: 12,
      color: colors.icon.alternative,
      borderColor: colors.primary.alternative,
    },
  });

const fuse = new Fuse<TokenListToken>([], {
  shouldSort: true,
  threshold: 0.45,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'symbol', weight: 0.5 },
  ],
});

interface Props {
  onSearch: ({
    results,
    searchQuery,
  }: {
    results: TokenListToken[];
    searchQuery: string;
  }) => void;
  /**
   * Callback that is called when the text input is focused
   */
  onFocus: () => void;
  /**
   * Callback that is called when the text input is blurred
   */
  onBlur: () => void;
}

// eslint-disable-next-line react/display-name
const AssetSearch = memo(({ onSearch, onFocus, onBlur }: Props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputDimensions, setInputDimensions] = useState('85%');
  const [isFocus, setIsFocus] = useState(false);
  const tokenList = useSelector(selectTokenListArray);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    setTimeout(() => {
      setInputDimensions('86%');
    }, 100);
  }, []);

  // Update fuse list
  useEffect(() => {
    fuse.setCollection(tokenList);
  }, [tokenList]);

  const handleSearch = useCallback(
    (searchText: string) => {
      setSearchQuery(searchText);
      const fuseSearchResult = fuse.search(searchText);
      const addressSearchResult = tokenList.filter((token) =>
        toLowerCaseEquals(token.address, searchText),
      );
      const results = [...addressSearchResult, ...fuseSearchResult];
      onSearch({ searchQuery: searchText, results });
    },
    [setSearchQuery, onSearch, tokenList],
  );

  return (
    <View
      style={[isFocus ? styles.searchSectionFocused : styles.searchSection]}
      testID={TokenViewSelectors.ASSET_SEARCH_SCREEN_CONTAINER}
    >
      <View style={styles.icon}>
        <Icon name={IconName.Search} size={IconSize.Sm} />
      </View>

      <View style={styles.input}>
        <TextInput
          style={[
            styles.textInput,
            { height: inputDimensions, width: inputDimensions },
          ]}
          value={searchQuery}
          onFocus={() => {
            onFocus();
            setIsFocus(true);
          }}
          onBlur={() => {
            onBlur();
            setIsFocus(false);
          }}
          placeholder={strings('token.search_tokens_placeholder')}
          placeholderTextColor={colors.text.muted}
          onChangeText={handleSearch}
          {...generateTestId(Platform, TOKEN_INPUT_BOX_ID)}
          keyboardAppearance={themeAppearance}
        />
      </View>

      <View style={styles.iconClose}>
        <ButtonIcon
          size={ButtonIconSizes.Sm}
          iconName={IconName.Close}
          onPress={() => {
            setSearchQuery('');
            handleSearch('');
          }}
        />
      </View>
    </View>
  );
});

export default AssetSearch;
