// Third party dependencies.
import React from 'react';
import { TextInput, View } from 'react-native';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import { mockTheme, useTheme } from '../../../../util/theme';

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

  return (
    <View style={styles.inputWrapper}>
      <Icon name="ios-search" size={20} color={colors.icon.default} />
      <TextInput
        style={styles.input}
        placeholder={strings('networks.search')}
        placeholderTextColor={colors.text.default}
        value={searchString}
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
