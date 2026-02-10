import React, { useCallback } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './styles';
import { selectSearchEngine } from '../../../reducers/browser/selectors';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../util/theme';

export interface UrlAutocompleteSearchFooterProps {
  /**
   * The search query string
   */
  searchQuery: string;
  /**
   * Callback when a search link is selected
   */
  onSelect: (url: string) => void;
  /**
   * Callback to hide the autocomplete when navigating
   */
  hide: () => void;
}

/**
 * Checks if a string looks like a URL
 */
function looksLikeUrl(str: string): boolean {
  return /^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?].*)?$/.test(str);
}

/**
 * Footer component that displays search options when no results match
 * Shows "Go to URL" option if search looks like a URL
 * Always shows "Search for XX on Google/DuckDuckGo" option
 */
const UrlAutocompleteSearchFooter: React.FC<
  UrlAutocompleteSearchFooterProps
> = ({ searchQuery, onSelect, hide }) => {
  const { styles } = useStyles(styleSheet);
  const { colors } = useTheme();
  const searchEngine = useSelector(selectSearchEngine);

  const handlePress = useCallback(
    (url: string) => {
      hide();
      onSelect(url);
    },
    [hide, onSelect],
  );

  if (!searchQuery || searchQuery.length === 0) {
    return null;
  }

  const isUrl = looksLikeUrl(searchQuery.toLowerCase());

  const searchUrl =
    searchEngine === 'DuckDuckGo'
      ? `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`
      : `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  const searchEngineLabel =
    searchEngine === 'DuckDuckGo' ? 'DuckDuckGo' : 'Google';

  return (
    <View style={styles.searchFooterContainer}>
      {isUrl && (
        <TouchableOpacity
          style={styles.searchFooterRow}
          onPress={() => handlePress(searchQuery)}
          testID="url-autocomplete-go-to-url"
        >
          <View style={styles.searchFooterTextWrapper}>
            <Text style={styles.searchFooterText} numberOfLines={1}>
              {searchQuery}
            </Text>
          </View>
          <View style={styles.searchFooterIcon}>
            <Icon
              name={IconName.Arrow2UpRight}
              size={IconSize.Md}
              color={colors.primary.default}
            />
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.searchFooterRow}
        onPress={() => handlePress(searchUrl)}
        testID="url-autocomplete-search-engine"
      >
        <View style={styles.searchFooterTextWrapper}>
          <Text style={styles.searchFooterText} numberOfLines={1}>
            Search for {'"'}
            {searchQuery}
            {'"'} on {searchEngineLabel}
          </Text>
        </View>
        <View style={styles.searchFooterIcon}>
          <Icon
            name={IconName.Arrow2UpRight}
            size={IconSize.Md}
            color={colors.primary.default}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

UrlAutocompleteSearchFooter.displayName = 'UrlAutocompleteSearchFooter';

export default UrlAutocompleteSearchFooter;
