import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  TextFieldSearch,
  Icon,
  IconName,
  IconSize,
  IconColor,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';

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

  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isButtonMode = props.type === 'button';
  const placeholder =
    props.placeholder || isBasicFunctionalityEnabled
      ? strings('trending.search_placeholder')
      : strings('trending.search_sites');

  // Button mode: tappable faux search bar (no text input).
  const searchBarStatic = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="h-12 gap-3 rounded-full border border-border-muted bg-muted px-4"
    >
      <Icon
        name={IconName.Search}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {placeholder}
      </Text>
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
          {searchBarStatic}
        </TouchableOpacity>
      ) : (
        <>
          <Box twClassName="flex-1" testID="explore-view-search-input">
            <TextFieldSearch
              value={props.searchQuery}
              onChangeText={props.onSearchChange}
              placeholder={placeholder}
              autoFocus={props.type === 'interactive'}
              onPressClearButton={() => {
                props.onSearchChange('');
              }}
              clearButtonProps={{ testID: 'explore-search-clear-button' }}
              inputProps={{
                autoCapitalize: 'none',
              }}
            />
          </Box>
          <TouchableOpacity
            onPress={() => {
              props.onSearchChange('');
              props.onCancel();
            }}
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
