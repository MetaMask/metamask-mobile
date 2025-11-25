import React, { useEffect, useState } from 'react';
import { TextInput, View, StyleSheet, TextStyle } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { BridgeToken } from '../Bridge/types';
import { useTokenSearch } from '../Bridge/hooks/useTokenSearch';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    searchSection: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.default,
      color: colors.text.default,
    },
    searchSectionFocused: {
      marginBottom: 0,
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

interface Props {
  onSearch: ({
    results,
    searchQuery,
  }: {
    results: BridgeToken[];
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

  /**
   * The selected network chain ID
   */
  allTokens: BridgeToken[];
}

// eslint-disable-next-line react/display-name
const AssetSearch = ({ onSearch, onFocus, onBlur, allTokens }: Props) => {
  const [isFocus, setIsFocus] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const {
    searchString,
    setSearchString,
    searchResults,
    debouncedSearchString,
  } = useTokenSearch({
    tokens: allTokens || [],
  });

  useEffect(() => {
    onSearch({ results: searchResults, searchQuery: debouncedSearchString });
  }, [searchResults, debouncedSearchString, onSearch]);

  return (
    <View
      style={[isFocus ? styles.searchSectionFocused : styles.searchSection]}
      testID={ImportTokenViewSelectorsIDs.ASSET_SEARCH_CONTAINER}
    >
      <View style={styles.icon}>
        <Icon name={IconName.Search} size={IconSize.Sm} />
      </View>

      <View style={styles.input}>
        <TextInput
          style={styles.textInput}
          value={searchString}
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
          onChangeText={(searchText) => setSearchString(searchText)}
          testID={ImportTokenViewSelectorsIDs.SEARCH_BAR}
          keyboardAppearance={themeAppearance}
        />
      </View>

      <View style={styles.iconClose}>
        <ButtonIcon
          size={ButtonIconSizes.Sm}
          iconName={IconName.Close}
          onPress={() => {
            setSearchString('');
          }}
          testID={ImportTokenViewSelectorsIDs.CLEAR_SEARCH_BAR}
        />
      </View>
    </View>
  );
};

export default AssetSearch;
