import React, { useEffect, useState } from 'react';
import {
  TextInput,
  View,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportTokenView.testIds';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { BridgeToken } from '../Bridge/types';
import { useTokenSearch } from '../Bridge/hooks/useTokenSearch';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) => {
  const commonSearchStyles = {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderColor: colors.border.default,
    color: colors.text.default,
  };
  return StyleSheet.create({
    searchSection: Object.assign({
      ...commonSearchStyles,
      borderWidth: 1,
    } as ViewStyle),
    searchSectionFocused: Object.assign({
      ...commonSearchStyles,
      borderWidth: 2,
      borderColor: colors.primary.default,
    } as ViewStyle),
    textInput: {
      ...fontStyles.normal,
      color: colors.text.default,
      height: 42,
    } as TextStyle,
    icon: {
      position: 'absolute',
      left: 16,
      color: colors.icon.alternative,
    },
    iconClose: {
      position: 'absolute',
      right: 16,
      color: colors.icon.alternative,
    },
    input: {
      width: '100%',
      paddingHorizontal: 42,
      color: colors.icon.alternative,
      borderColor: colors.primary.alternative,
    },
  });
};

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

      {searchString.length > 0 && (
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
      )}
    </View>
  );
};

export default AssetSearch;
