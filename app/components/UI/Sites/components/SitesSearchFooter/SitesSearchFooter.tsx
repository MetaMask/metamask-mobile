import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { selectSearchEngine } from '../../../../../reducers/browser/selectors';

export interface SitesSearchFooterProps {
  searchQuery: string;
}

/**
 * Checks if a string looks like a URL
 */
function looksLikeUrl(str: string): boolean {
  return /^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?].*)?$/.test(str);
}

const SitesSearchFooter: React.FC<SitesSearchFooterProps> = ({
  searchQuery,
}) => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const searchEngine = useSelector(selectSearchEngine);

  const onPressLink = useCallback(
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
    <Box>
      {isUrl && (
        <TouchableOpacity
          style={tw.style('flex-row items-center py-4')}
          onPress={() => onPressLink(searchQuery)}
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
        onPress={() => onPressLink(searchUrl)}
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
