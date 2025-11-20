import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';

interface ExploreSearchBarButtonProps {
  type: 'button';
  onPress: () => void;
}

interface ExploreSearchBarInteractiveProps {
  type: 'interactive';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCancel: () => void;
}

type ExploreSearchBarProps =
  | ExploreSearchBarButtonProps
  | ExploreSearchBarInteractiveProps;

const ExploreSearchBar: React.FC<ExploreSearchBarProps> = (props) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const isInteractiveMode = props.type === 'interactive';
  const isButtonMode = props.type === 'button';

  const handleCancel = () => {
    if (isInteractiveMode) {
      props.onSearchChange('');
      props.onCancel();
    }
  };

  const handleClear = () => {
    if (isInteractiveMode) {
      props.onSearchChange('');
    }
  };

  // Common search bar content
  const searchBarContent = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="bg-muted rounded-lg px-3"
      style={tw.style('min-h-[44px]')}
    >
      <Icon
        name={IconName.Search}
        size={IconSize.Md}
        color={IconColor.Muted}
        style={tw.style('mr-2')}
      />
      {isButtonMode ? (
        <Text variant={TextVariant.BodyMd} style={tw.style('text-muted')}>
          {strings('trending.search_placeholder')}
        </Text>
      ) : (
        <>
          <TextInput
            value={props.searchQuery}
            onChangeText={props.onSearchChange}
            placeholder={strings('trending.search_placeholder')}
            placeholderTextColor={colors.text.muted}
            style={tw.style('flex-1 text-base text-default py-2.5')}
            testID="explore-view-search-input"
            autoFocus={props.type === 'interactive'}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={handleClear}
            testID="explore-search-clear-button"
            disabled={!props.searchQuery || props.searchQuery.length === 0}
            style={tw.style(
              props.searchQuery && props.searchQuery.length > 0
                ? 'opacity-100'
                : 'opacity-0',
            )}
          >
            <Icon
              name={IconName.CircleX}
              size={IconSize.Md}
              color={IconColor.Muted}
            />
          </TouchableOpacity>
        </>
      )}
    </Box>
  );

  return (
    <Box twClassName="px-4 pb-3">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        {isButtonMode ? (
          <TouchableOpacity
            onPress={props.onPress}
            testID="explore-view-search-button"
            activeOpacity={0.7}
            style={tw.style('flex-1')}
          >
            {searchBarContent}
          </TouchableOpacity>
        ) : (
          <>
            <Box twClassName="flex-1">{searchBarContent}</Box>
            <TouchableOpacity
              onPress={handleCancel}
              testID="explore-search-cancel-button"
            >
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('text-default font-medium')}
              >
                {strings('transaction.cancel')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Box>
    </Box>
  );
};

export default ExploreSearchBar;
