import React, { useCallback } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PerpsSearchBar.styles';
import type { PerpsSearchBarProps } from './PerpsSearchBar.types';

/**
 * PerpsSearchBar Component
 *
 * Reusable search input UI component with no internal state.
 * Fully controlled component - parent manages search state.
 *
 * Features:
 * - Search icon on the left
 * - Clear button on the right (when text exists)
 * - Configurable placeholder and auto-focus
 * - Consistent styling across all Perps views
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 *
 * <PerpsSearchBar
 *   value={searchQuery}
 *   onChangeText={setSearchQuery}
 *   autoFocus
 * />
 * ```
 */
const PerpsSearchBar: React.FC<PerpsSearchBarProps> = ({
  value,
  onChangeText,
  placeholder = strings('perps.search_by_token_symbol'),
  autoFocus = false,
  onClear,
  testID = 'perps-search-bar',
}) => {
  const { styles, theme } = useStyles(styleSheet, {});

  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    } else {
      onChangeText('');
    }
  }, [onClear, onChangeText]);

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.inputContainer}>
        <Icon
          name={IconName.Search}
          size={IconSize.Lg}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          testID={`${testID}-input`}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            testID={`${testID}-clear`}
          >
            <Icon name={IconName.Close} size={IconSize.Sm} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default PerpsSearchBar;
