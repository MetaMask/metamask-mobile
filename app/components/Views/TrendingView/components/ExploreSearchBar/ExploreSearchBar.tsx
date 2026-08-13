import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, type TextInput } from 'react-native';
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
import {
  Theme,
  useTailwind,
  useTheme,
} from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import { TrendingViewSelectorsIDs } from '../../TrendingView.testIds';

interface ExploreSearchBarButtonProps {
  type: 'button';
  onPress: () => void;
  placeholder?: string;
  /** Tailwind gap class for the search + cancel row. Defaults to `gap-2`. */
  rowTwClassName?: string;
}

interface ExploreSearchBarInteractiveProps {
  type: 'interactive';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCancel: () => void;
  placeholder?: string;
  /** Tailwind gap class for the search + cancel row. Defaults to `gap-2`. */
  rowTwClassName?: string;
  /**
   * Focus the input. Defaults to `true`; flipping it from `false` to `true`
   * focuses the input then, so callers can hold the keyboard back until their
   * screen transition finishes — opening it mid-push makes iOS paint the
   * keyboard dark grey until the animation settles.
   */
  autoFocus?: boolean;
}

type ExploreSearchBarProps =
  | ExploreSearchBarButtonProps
  | ExploreSearchBarInteractiveProps;

const ExploreSearchBar: React.FC<ExploreSearchBarProps> = (props) => {
  const tw = useTailwind();
  const theme = useTheme();
  // Left unset, the input keeps the system keyboard, which stays light in dark mode.
  const keyboardAppearance = theme === Theme.Dark ? 'dark' : 'light';

  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isButtonMode = props.type === 'button';
  const rowTwClassName = props.rowTwClassName ?? 'gap-2';
  const shouldFocus = props.type === 'interactive' && (props.autoFocus ?? true);
  const inputRef = useRef<TextInput>(null);

  // `autoFocus` only applies on mount, so callers turning it on later need this.
  useEffect(() => {
    if (shouldFocus) {
      inputRef.current?.focus();
    }
  }, [shouldFocus]);

  const placeholder =
    props.placeholder ??
    (isBasicFunctionalityEnabled
      ? strings('trending.search_placeholder')
      : strings('trending.search_sites'));

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
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        twClassName="flex-1"
      >
        {placeholder}
      </Text>
    </Box>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={rowTwClassName}
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
          <Box
            twClassName="flex-1"
            testID={TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_INPUT}
          >
            <TextFieldSearch
              value={props.searchQuery}
              onChangeText={props.onSearchChange}
              placeholder={placeholder}
              autoFocus={shouldFocus}
              inputRef={inputRef}
              onPressClearButton={() => {
                props.onSearchChange('');
              }}
              clearButtonProps={{ testID: 'explore-search-clear-button' }}
              inputProps={{
                autoCapitalize: 'none',
                keyboardAppearance,
                testID: TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
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
