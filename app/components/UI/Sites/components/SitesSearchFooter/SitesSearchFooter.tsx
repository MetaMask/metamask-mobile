import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  BoxProps,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectSearchEngine } from '../../../../../reducers/browser/selectors';
import {
  looksLikeUrl,
  getSearchUrl,
  navigateToBrowser,
} from '../../utils/search';

export interface SitesSearchFooterProps {
  searchQuery: string;
  /**
   * Callback for when pressing a sites footer link.
   * Defaults to browser navigation.
   * @param {string} url - Url to navigate
   */
  onPress?: (url: string) => void;
  containerStyle?: BoxProps['style'];
}

/**
 * Checks if a string looks like a URL
 */
function looksLikeUrl(str: string): boolean {
  return /^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?].*)?$/.test(str);
}

export const useSearchFooterBrowserNavigation = () => {
  const navigation = useNavigation();

  const onPress = useCallback(
    (url: string) => {
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: url,
          timestamp: Date.now(),
          fromTrending: true,
        },
      });
    },
    [navigation],
  );

  return { onPress };
};

const SitesSearchFooter: React.FC<SitesSearchFooterProps> = ({
  searchQuery,
  onPress,
  containerStyle,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const searchEngine = useSelector(selectSearchEngine);

  const defaultOnPress = useCallback(
    (url: string) => navigateToBrowser(navigation, url),
    [navigation],
  );
  const handlePress = onPress ?? defaultOnPress;

  if (!searchQuery || searchQuery.length === 0) {
    return null;
  }

  const isUrl = looksLikeUrl(searchQuery.toLowerCase());
  const searchUrl = getSearchUrl(searchQuery, searchEngine);
  const searchEngineLabel =
    searchEngine === 'DuckDuckGo' ? 'DuckDuckGo' : 'Google';

  return (
    <Box style={containerStyle}>
      {isUrl && (
        <TouchableOpacity
          style={tw.style('flex-row items-center py-4')}
          onPress={() => handlePress(searchQuery)}
          testID="trending-search-footer-url-link"
        >
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary"
              numberOfLines={1}
            >
              {searchQuery}
            </Text>
          </Box>
          <Box twClassName="ml-3">
            <Icon
              name={IconName.Arrow2UpRight}
              size={IconSize.Md}
              twClassName="text-primary"
            />
          </Box>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={tw.style('flex-row items-center py-4')}
        onPress={() => handlePress(searchUrl)}
        testID="trending-search-footer-google-link"
      >
        <Box twClassName="flex-1 flex-row items-center">
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-primary shrink-0"
          >
            Search for {'"'}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-primary shrink"
            numberOfLines={1}
          >
            {searchQuery}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-primary shrink-0"
          >
            {'"'} on {searchEngineLabel}
          </Text>
        </Box>
        <Box twClassName="ml-3">
          <Icon
            name={IconName.Arrow2UpRight}
            size={IconSize.Md}
            twClassName="text-primary"
          />
        </Box>
      </TouchableOpacity>
    </Box>
  );
};

SitesSearchFooter.displayName = 'SitesSearchFooter';

export default SitesSearchFooter;
