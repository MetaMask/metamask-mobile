import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, type TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  ButtonIcon,
  ButtonIconSize,
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
import { useSearchAccessoryAnimation } from './ExploreSearchBar.animations';

interface ExploreSearchBarButtonProps {
  type: 'button';
  onPress: () => void;
  placeholder?: string;
  showPastePill?: boolean;
  onPastePress?: () => void;
  clipboardButtonTestID?: string;
  /** Tailwind gap class for the search + cancel row. Defaults to `gap-2`. */
  rowTwClassName?: string;
}

interface ExploreSearchBarInteractiveProps {
  type: 'interactive';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCancel: () => void;
  startAccessory?: React.ReactNode;
  placeholder?: string;
  showPastePill?: boolean;
  onPastePress?: () => void;
  clipboardButtonTestID?: string;
  /** Tailwind gap class for the search + cancel row. Defaults to `gap-2`. */
  rowTwClassName?: string;
  /**
   * Focus the input. Defaults to `true`; flipping it from `false` to `true`
   * focuses the input then, so callers can hold the keyboard back until their
   * screen transition finishes — opening it mid-push makes iOS paint the
   * keyboard dark grey until the animation settles.
   */
  autoFocus?: boolean;
  dismissVariant?: 'cancel' | 'back';
}

type ExploreSearchBarProps =
  | ExploreSearchBarButtonProps
  | ExploreSearchBarInteractiveProps;

interface SearchEndAccessoryProps {
  showPastePill: boolean;
  hasSearchQuery: boolean;
  onPastePress: () => void;
  onClearPress: () => void;
  clipboardButtonTestID?: string;
}

const SearchEndAccessory = ({
  showPastePill,
  hasSearchQuery,
  onPastePress,
  onClearPress,
  clipboardButtonTestID,
}: SearchEndAccessoryProps) => {
  const tw = useTailwind();
  const shouldShowPastePill = showPastePill && !hasSearchQuery;
  const { containerStyle, clipboardStyle, clearStyle } =
    useSearchAccessoryAnimation(shouldShowPastePill);

  if (!shouldShowPastePill && !hasSearchQuery) {
    return null;
  }

  return (
    <Animated.View
      style={[
        tw.style('h-8 items-center justify-center overflow-hidden'),
        containerStyle,
      ]}
    >
      <Animated.View
        pointerEvents={shouldShowPastePill ? 'auto' : 'none'}
        style={[
          tw.style('absolute inset-0 items-center justify-center'),
          clipboardStyle,
        ]}
      >
        <ButtonIcon
          iconName={IconName.Clipboard}
          size={ButtonIconSize.Md}
          onPress={onPastePress}
          accessibilityLabel={strings('send.paste')}
          testID={clipboardButtonTestID ?? 'explore-search-clipboard-button'}
        />
      </Animated.View>
      <Animated.View
        pointerEvents={shouldShowPastePill ? 'none' : 'auto'}
        style={[
          tw.style('absolute inset-0 items-center justify-center'),
          clearStyle,
        ]}
      >
        <ButtonIcon
          iconName={IconName.CircleX}
          size={ButtonIconSize.Md}
          onPress={onClearPress}
          testID="explore-search-clear-button"
        />
      </Animated.View>
    </Animated.View>
  );
};

const noop = () => undefined;

interface ResolvedPlaceholder {
  resolvedPlaceholder: string;
}

const ExploreSearchBarButton = ({
  onPress,
  showPastePill,
  onPastePress,
  clipboardButtonTestID,
  rowTwClassName = 'flex-1 gap-2',
  resolvedPlaceholder,
}: ExploreSearchBarButtonProps & ResolvedPlaceholder) => {
  const tw = useTailwind();
  const buttonPastePill =
    showPastePill && onPastePress ? (
      <Animated.View entering={FadeInDown.duration(180)}>
        <ButtonIcon
          iconName={IconName.Clipboard}
          size={ButtonIconSize.Md}
          onPress={onPastePress}
          accessibilityLabel={strings('send.paste')}
          testID={clipboardButtonTestID ?? 'explore-search-clipboard-button'}
        />
      </Animated.View>
    ) : null;

  const searchBarContent = (
    <>
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
        {resolvedPlaceholder}
      </Text>
    </>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={rowTwClassName}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="h-10 flex-1 gap-3 rounded-full border border-border-muted bg-muted px-4"
      >
        <TouchableOpacity
          onPress={onPress}
          testID="explore-view-search-button"
          activeOpacity={0.7}
          style={tw.style('flex-1 flex-row items-center gap-3')}
        >
          {searchBarContent}
        </TouchableOpacity>
        {buttonPastePill}
      </Box>
    </Box>
  );
};

const ExploreSearchBarInteractive = ({
  searchQuery,
  onSearchChange,
  onCancel,
  startAccessory,
  showPastePill: showPastePillProp,
  onPastePress,
  clipboardButtonTestID,
  rowTwClassName = 'gap-2',
  autoFocus = true,
  dismissVariant,
  resolvedPlaceholder,
}: ExploreSearchBarInteractiveProps & ResolvedPlaceholder) => {
  const tw = useTailwind();
  const theme = useTheme();
  // Left unset, the input keeps the system keyboard, which stays light in dark mode.
  const keyboardAppearance = theme === Theme.Dark ? 'dark' : 'light';
  const inputRef = useRef<TextInput>(null);
  const isBackVariant = dismissVariant === 'back';
  const hasSearchQuery = searchQuery.length > 0;
  const showPastePill = Boolean(showPastePillProp) && !hasSearchQuery;
  const shouldRenderEndAccessory =
    Boolean(showPastePillProp) && (showPastePill || hasSearchQuery);

  const dismissSearch = () => {
    onSearchChange('');
    onCancel();
  };

  // `autoFocus` only applies on mount, so callers turning it on later need this.
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const endAccessory = shouldRenderEndAccessory ? (
    <SearchEndAccessory
      showPastePill={showPastePill}
      hasSearchQuery={hasSearchQuery}
      onPastePress={onPastePress ?? noop}
      onClearPress={() => onSearchChange('')}
      clipboardButtonTestID={clipboardButtonTestID}
    />
  ) : undefined;

  let resolvedStartAccessory = startAccessory;
  if (resolvedStartAccessory == null && isBackVariant) {
    resolvedStartAccessory = (
      <ButtonIcon
        iconName={IconName.Arrow2Left}
        size={ButtonIconSize.Md}
        onPress={dismissSearch}
        accessibilityLabel={strings('navigation.back')}
        testID={TrendingViewSelectorsIDs.EXPLORE_SEARCH_BACK_BUTTON}
      />
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={rowTwClassName}
    >
      <Box
        twClassName="flex-1"
        testID={TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_INPUT}
      >
        <TextFieldSearch
          twClassName="h-10"
          endAccessory={endAccessory}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={resolvedPlaceholder}
          autoFocus={autoFocus}
          inputRef={inputRef}
          onPressClearButton={() => {
            onSearchChange('');
          }}
          clearButtonProps={{ testID: 'explore-search-clear-button' }}
          startAccessory={resolvedStartAccessory}
          inputProps={{
            autoCapitalize: 'none',
            keyboardAppearance,
            testID: TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
          }}
        />
      </Box>
      {!isBackVariant && (
        <TouchableOpacity
          onPress={dismissSearch}
          testID={TrendingViewSelectorsIDs.EXPLORE_SEARCH_CANCEL_BUTTON}
        >
          <Text
            variant={TextVariant.BodyMd}
            style={tw.style('text-default font-medium')}
          >
            {strings('transaction.cancel')}
          </Text>
        </TouchableOpacity>
      )}
    </Box>
  );
};

const ExploreSearchBar: React.FC<ExploreSearchBarProps> = (props) => {
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const resolvedPlaceholder =
    props.placeholder ??
    (isBasicFunctionalityEnabled
      ? strings('trending.search_placeholder')
      : strings('trending.search_sites'));

  if (props.type === 'button') {
    return (
      <ExploreSearchBarButton
        {...props}
        resolvedPlaceholder={resolvedPlaceholder}
      />
    );
  }

  return (
    <ExploreSearchBarInteractive
      {...props}
      resolvedPlaceholder={resolvedPlaceholder}
    />
  );
};

export default ExploreSearchBar;
