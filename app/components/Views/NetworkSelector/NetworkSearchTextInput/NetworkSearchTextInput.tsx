// Third party dependencies.
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import { mockTheme, useTheme } from '../../../../util/theme';

// Internal dependencies
import Icon from 'react-native-vector-icons/Ionicons';
import createStyles from './NetworkSearchTextInput.styles';
import { NetworksViewSelectorsIDs } from '../../Settings/NetworksSettings/NetworksView.testIds';
import { isNetworkUiRedesignEnabled } from '../../../../util/networks/isNetworkUiRedesignEnabled';

interface NetworkSearchTextInputProps {
  searchString: string;
  handleSearchTextChange: (text: string) => void;
  clearSearchInput: () => void;
  testIdSearchInput: string;
  testIdCloseIcon: string;
}
function NetworkSearchTextInput({
  searchString,
  handleSearchTextChange,
  clearSearchInput,
}: NetworkSearchTextInputProps) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors || mockTheme.colors);
  const [isSearchFieldFocused, setIsSearchFieldFocused] = useState(false);
  const searchPlaceHolder = isNetworkUiRedesignEnabled()
    ? 'search-short'
    : 'search';

  const propsWhichAreFeatureFlagged = isNetworkUiRedesignEnabled()
    ? {
        onFocus: () => {
          isNetworkUiRedesignEnabled() && setIsSearchFieldFocused(true);
        },
        onBlur: () => {
          isNetworkUiRedesignEnabled() && setIsSearchFieldFocused(false);
        },
      }
    : {};

  const inputStylesWhichAreFeatureFlagged = !isNetworkUiRedesignEnabled()
    ? styles.input
    : isSearchFieldFocused
      ? styles.input
      : styles.unfocusedInput;

  const containerInputStylesWhichAreFeatureFlagged =
    !isNetworkUiRedesignEnabled()
      ? styles.inputWrapper
      : isSearchFieldFocused
        ? styles.focusedInputWrapper
        : styles.inputWrapper;

  return (
    <View style={containerInputStylesWhichAreFeatureFlagged}>
      <Icon name="search" size={20} color={colors.icon.default} />
      <TextInput
        style={inputStylesWhichAreFeatureFlagged}
        placeholder={strings(`networks.${searchPlaceHolder}`)}
        placeholderTextColor={colors.text.default}
        value={searchString}
        onChangeText={handleSearchTextChange}
        testID={NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID}
        {...propsWhichAreFeatureFlagged}
      />
      {searchString.length > 0 && (
        <Icon
          name="close"
          size={20}
          color={colors.icon.default}
          onPress={clearSearchInput}
          testID={NetworksViewSelectorsIDs.CLOSE_ICON}
        />
      )}
    </View>
  );
}

export default NetworkSearchTextInput;
