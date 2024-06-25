// Third party dependencies.
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import { mockTheme, useTheme } from '../../../../util/theme';
import { isNetworkUiRedesignEnabled } from '../../../../util/networks';

// Internal dependencies
import Icon from 'react-native-vector-icons/Ionicons';
import createStyles from './NetworkSearchTextInput.styles';
import { NetworksViewSelectorsIDs } from '../../../../../e2e/selectors/Settings/NetworksView.selectors';

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
  const searchPlaceHolder = isNetworkUiRedesignEnabled
    ? 'search-short'
    : 'search';

  return (
    <View
      style={[
        styles.inputWrapper,
        isSearchFieldFocused && styles.focusedInputWrapper,
      ]}
    >
      <Icon name="ios-search" size={20} color={colors.icon.default} />
      <TextInput
        style={styles.input}
        placeholder={strings(`networks.${searchPlaceHolder}`)}
        placeholderTextColor={colors.text.default}
        value={searchString}
        onFocus={() => {
          isNetworkUiRedesignEnabled && setIsSearchFieldFocused(true);
        }}
        onBlur={() => {
          isNetworkUiRedesignEnabled && setIsSearchFieldFocused(false);
        }}
        onChangeText={handleSearchTextChange}
        testID={NetworksViewSelectorsIDs.SEARCH_NETWORK_INPUT_BOX_ID}
      />
      {searchString.length > 0 && (
        <Icon
          name="ios-close"
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
