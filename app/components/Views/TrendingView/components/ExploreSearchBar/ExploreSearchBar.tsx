import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, type TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  Button,
  ButtonBaseSize,
  ButtonVariant,
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
  pasteButtonTestID?: string;
  /** Tailwind gap class for the search + cancel row. Defaults to `gap-2`. */
  rowTwClassName?: string;
}

interface ExploreSearchBarInteractiveProps {
  type: 'interactive';
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCancel: () => void;
  placeholder?: string;
  showPastePill?: boolean;
  onPastePress?: () => void;
  pasteButtonTestID?: string;
  hideDismissButton?: boolean;
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
  pasteButtonTestID?: string;
}

const SearchEndAccessory = ({
  showPastePill,
  hasSearchQuery,
  onPastePress,
  onClearPress,
  pasteButtonTestID,
}: SearchEndAccessoryProps) => {
  const tw = useTailwind();
  const shouldShowPastePill = showPastePill && !hasSearchQuery;
  const { containerStyle, pasteStyle, clearStyle } =
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
          pasteStyle,
        ]}
      >
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonBaseSize.Sm}
          twClassName="h-8 w-20"
          onPress={onPastePress}
          testID={pasteButtonTestID ?? 'explore-search-paste-button'}
        >
          {strings('send.paste')}
        </Button>
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

const ExploreSearchBar: React.FC<ExploreSearchBarProps> = (props) => {
  const tw = useTailwind();
  const theme = useTheme();
  // Left unset, the input keeps the system keyboard, which stays light in dark mode.
  const keyboardAppearance = theme === Theme.Dark ? 'dark' : 'light';

  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  const isButtonMode = props.type === 'button';
  const rowTwClassName =
    props.rowTwClassName ?? (isButtonMode ? 'flex-1 gap-2' : 'gap-2');
  const shouldFocus = props.type === 'interactive' && (props.autoFocus ?? true);
  const isBackVariant =
    props.type === 'interactive' && props.dismissVariant === 'back';
  const inputRef = useRef<TextInput>(null);

  const dismissSearch = () => {
    if (props.type !== 'interactive') {
      return;
    }
    props.onSearchChange('');
    props.onCancel();
  };

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

  const buttonPastePill =
    props.type === 'button' && props.showPastePill && props.onPastePress ? (
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="h-8"
      >
        <Animated.View entering={FadeInDown.duration(180)}>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonBaseSize.Sm}
            twClassName="h-8 w-20"
            onPress={props.onPastePress}
            testID={props.pasteButtonTestID ?? 'explore-search-paste-button'}
          >
            {strings('send.paste')}
          </Button>
        </Animated.View>
      </Box>
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
        {placeholder}
      </Text>
    </>
  );

  // Button mode: tappable faux search bar (no text input).
  const searchBarStatic = (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="h-12 flex-1 gap-3 rounded-full border border-border-muted bg-muted px-4"
    >
      <TouchableOpacity
        onPress={props.type === 'button' ? props.onPress : undefined}
        testID="explore-view-search-button"
        activeOpacity={0.7}
        style={tw.style('flex-1 flex-row items-center gap-3')}
      >
        {searchBarContent}
      </TouchableOpacity>
      {buttonPastePill}
    </Box>
  );

  const hasSearchQuery =
    props.type === 'interactive' && props.searchQuery.length > 0;
  const showPastePill =
    props.type === 'interactive' &&
    Boolean(props.showPastePill) &&
    !hasSearchQuery;
  const onPastePress =
    props.type === 'interactive' ? props.onPastePress : undefined;
  const shouldRenderEndAccessory =
    props.type === 'interactive' &&
    Boolean(props.showPastePill) &&
    (showPastePill || hasSearchQuery);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={rowTwClassName}
    >
      {isButtonMode ? (
        searchBarStatic
      ) : (
        <>
          <Box
            twClassName="flex-1"
            testID={TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_INPUT}
          >
            <TextFieldSearch
              {...(shouldRenderEndAccessory
                ? {
                    endAccessory: (
                      <SearchEndAccessory
                        showPastePill={showPastePill}
                        hasSearchQuery={hasSearchQuery}
                        onPastePress={onPastePress ?? (() => undefined)}
                        onClearPress={() => props.onSearchChange('')}
                        pasteButtonTestID={props.pasteButtonTestID}
                      />
                    ),
                  }
                : {})}
              value={props.searchQuery}
              onChangeText={props.onSearchChange}
              placeholder={placeholder}
              autoFocus={shouldFocus}
              inputRef={inputRef}
              onPressClearButton={() => {
                props.onSearchChange('');
              }}
              clearButtonProps={{ testID: 'explore-search-clear-button' }}
              startAccessory={
                isBackVariant ? (
                  <ButtonIcon
                    iconName={IconName.Arrow2Left}
                    size={ButtonIconSize.Md}
                    onPress={dismissSearch}
                    accessibilityLabel={strings('navigation.back')}
                    testID={TrendingViewSelectorsIDs.EXPLORE_SEARCH_BACK_BUTTON}
                  />
                ) : undefined
              }
              inputProps={{
                autoCapitalize: 'none',
                keyboardAppearance,
                testID: TrendingViewSelectorsIDs.EXPLORE_VIEW_SEARCH_TEXT_INPUT,
              }}
            />
          </Box>
          {!isBackVariant && !props.hideDismissButton && (
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
        </>
      )}
    </Box>
  );
};

export default ExploreSearchBar;
