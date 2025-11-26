import React from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';

interface ExploreSearchBarButtonProps {
  type: 'button';
  onPress: () => void;
  placeholder?: string;
}

interface ExploreSearchBarInteractiveProps {
  type: 'interactive';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

type ExploreSearchBarProps =
  | ExploreSearchBarButtonProps
  | ExploreSearchBarInteractiveProps;

const ExploreSearchBar: React.FC<ExploreSearchBarProps> = (props) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isInteractiveMode = props.type === 'interactive';
  const isButtonMode = props.type === 'button';
  const placeholder =
    props.placeholder || isBasicFunctionalityEnabled
      ? strings('trending.search_placeholder')
      : strings('trending.search_sites');

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
        color={IconColor.IconMuted}
        style={tw.style('mr-2')}
      />
      {isButtonMode ? (
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {placeholder}
        </Text>
      ) : (
        <>
          <TextInput
            value={props.searchQuery}
            onChangeText={props.onSearchChange}
            placeholder={placeholder}
            placeholderTextColor={colors.text.alternative}
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
              color={IconColor.IconAlternative}
            />
          </TouchableOpacity>
        </>
      )}
    </Box>
  );

  return (
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
  );
};

export default ExploreSearchBar;
