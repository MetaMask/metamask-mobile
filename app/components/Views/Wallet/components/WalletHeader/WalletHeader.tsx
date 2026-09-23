import React, { memo, useCallback, useRef } from 'react';
import { Animated, useAnimatedValue, View, type ViewStyle } from 'react-native';
import {
  useFocusEffect,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import {
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  HeaderRoot,
  IconColor as MMDSIconColor,
  IconName as MMDSIconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import PickerAccount from '../../../../../component-library/components/Pickers/PickerAccount';
import AddressCopy from '../../../../UI/AddressCopy';
import CardButton from '../../../../UI/Card/components/CardButton';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createAccountSelectorNavDetails } from '../../../AccountSelector';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ExploreSearchBar from '../../../TrendingView/components/ExploreSearchBar/ExploreSearchBar';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SearchOrigin } from '../../../TrendingView/search/useHomepageSearchPaste';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const searchBarWrapperStyle: ViewStyle = { flex: 1 };
const accountPickerContainerStyle: ViewStyle = { flex: 1 };
const menuTransitionWrapperStyle: ViewStyle = {
  height: 48,
  overflow: 'hidden',
};

export interface WalletHeaderProps {
  displayName: string;
  navigation: unknown;
  isMoneyAccountVisible: boolean;
  handleSearchPress: (
    initialQuery?: string,
    origin?: SearchOrigin,
    pastePillVisible?: boolean,
  ) => void;
  useSearchHeaderLayout: boolean;
  showSearchPastePill: boolean;
  handleSearchPastePress: (origin?: SearchOrigin) => void;
  handleActivityPress: () => void;
  handleCardPress: () => void;
  handleHamburgerPress: () => void;
  touchAreaSlop: TouchAreaSlop;
  headerActionButtonsContainerStyle: ViewStyle;
  headerAccountPickerStyle: ViewStyle;
}

const WalletHeader = ({
  isMoneyAccountVisible,
  handleSearchPress,
  showSearchPastePill,
  handleSearchPastePress,
  useSearchHeaderLayout,
  handleActivityPress,
  handleCardPress,
  handleHamburgerPress,
  touchAreaSlop,
  displayName,
  navigation,
  headerActionButtonsContainerStyle,
  headerAccountPickerStyle,
}: WalletHeaderProps) => {
  const hasAccountsMenuAttention = useAccountsMenuAttention();
  const searchBarRef = useRef<View>(null);
  const menuTransition = useAnimatedValue(0);
  const searchTransitionStarted = useRef(false);

  useFocusEffect(
    useCallback(() => {
      searchTransitionStarted.current = false;
      menuTransition.setValue(0);
    }, [menuTransition]),
  );

  const menuTransitionStyle = {
    width: menuTransition.interpolate({
      inputRange: [0, 1],
      outputRange: [32, 0],
    }),
    marginRight: menuTransition.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -8],
    }),
    opacity: menuTransition.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [1, 1, 0],
    }),
  };

  const measureSearchOrigin = useCallback(
    (callback: (origin?: SearchOrigin) => void) => {
      const searchBar = searchBarRef.current;
      if (!searchBar) {
        callback();
        return;
      }

      if (process.env.NODE_ENV === 'test') {
        callback();
        return;
      }

      searchBar.measureInWindow((x, y, width, height) => {
        callback({ x, y, width, height });
      });
    },
    [],
  );

  const menuButton = (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="h-12"
    >
      <BadgeWrapper
        position={BadgeWrapperPosition.TopRight}
        positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
        badge={
          hasAccountsMenuAttention ? (
            <BadgeStatus
              status={BadgeStatusStatus.Attention}
              testID={WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE}
            />
          ) : null
        }
      >
        <ButtonIcon
          iconProps={{ color: MMDSIconColor.IconDefault }}
          onPress={handleHamburgerPress}
          iconName={MMDSIconName.Menu}
          size={ButtonIconSize.Md}
          testID={WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON}
          hitSlop={touchAreaSlop}
        />
      </BadgeWrapper>
    </Box>
  );

  const startSearchTransition = useCallback(
    (callback: (origin?: SearchOrigin) => void) => {
      measureSearchOrigin((origin) => {
        if (process.env.NODE_ENV === 'test') {
          callback(origin);
          return;
        }

        if (searchTransitionStarted.current) {
          return;
        }
        searchTransitionStarted.current = true;
        Animated.timing(menuTransition, {
          duration: 220,
          toValue: 1,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            callback(origin);
          }
        });
      });
    },
    [measureSearchOrigin, menuTransition],
  );

  const handleHeaderSearchPress = () => {
    startSearchTransition((origin) =>
      handleSearchPress(undefined, origin, showSearchPastePill),
    );
  };
  const handleHeaderPastePress = () => {
    startSearchTransition(handleSearchPastePress);
  };

  const handleAccountPickerPress = useCallback(() => {
    (navigation as NavigationProp<ParamListBase>).navigate(
      ...createAccountSelectorNavDetails({}),
    );
  }, [navigation]);

  if (!useSearchHeaderLayout) {
    return (
      <HeaderRoot
        testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
        endAccessory={
          <View style={headerActionButtonsContainerStyle} accessible={false}>
            <ButtonIcon
              iconProps={{ color: MMDSIconColor.IconDefault }}
              onPress={() => handleSearchPress()}
              iconName={MMDSIconName.Search}
              size={ButtonIconSize.Md}
              testID={WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON}
              accessibilityLabel={strings('wallet.search_accessibility_label')}
              hitSlop={touchAreaSlop}
            />
            {isMoneyAccountVisible && (
              <ButtonIcon
                iconProps={{ color: MMDSIconColor.IconDefault }}
                onPress={handleActivityPress}
                iconName={MMDSIconName.Clock}
                size={ButtonIconSize.Md}
                testID={WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON}
                hitSlop={touchAreaSlop}
              />
            )}
            <AddressCopy
              testID={WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON}
              hitSlop={touchAreaSlop}
            />
            {!isMoneyAccountVisible && (
              <CardButton
                onPress={handleCardPress}
                touchAreaSlop={touchAreaSlop}
              />
            )}
            <BadgeWrapper
              position={BadgeWrapperPosition.TopRight}
              positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
              badge={
                hasAccountsMenuAttention ? (
                  <BadgeStatus
                    status={BadgeStatusStatus.Attention}
                    testID={WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BADGE}
                  />
                ) : null
              }
            >
              <ButtonIcon
                iconProps={{ color: MMDSIconColor.IconDefault }}
                onPress={handleHamburgerPress}
                iconName={MMDSIconName.Menu}
                size={ButtonIconSize.Md}
                testID={WalletViewSelectorsIDs.WALLET_HAMBURGER_MENU_BUTTON}
                hitSlop={touchAreaSlop}
              />
            </BadgeWrapper>
          </View>
        }
        twClassName="pl-1 pr-3"
      >
        <View style={accountPickerContainerStyle}>
          <PickerAccount
            accountName={displayName}
            onPress={handleAccountPickerPress}
            testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
            hitSlop={touchAreaSlop}
            style={headerAccountPickerStyle}
          />
        </View>
      </HeaderRoot>
    );
  }

  return (
    <HeaderRoot
      testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
      endAccessory={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="h-12 gap-2"
          accessible={false}
        >
          {isMoneyAccountVisible ? (
            <ButtonIcon
              iconProps={{ color: MMDSIconColor.IconDefault }}
              onPress={handleActivityPress}
              iconName={MMDSIconName.Clock}
              size={ButtonIconSize.Md}
              testID={WalletViewSelectorsIDs.WALLET_ACTIVITY_BUTTON}
              hitSlop={touchAreaSlop}
            />
          ) : (
            <CardButton
              onPress={handleCardPress}
              touchAreaSlop={touchAreaSlop}
            />
          )}
          <AddressCopy
            testID={WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON}
            hitSlop={touchAreaSlop}
          />
        </Box>
      }
      twClassName="pl-4 pr-3"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="h-12 flex-1 gap-2"
      >
        <Animated.View
          style={[menuTransitionWrapperStyle, menuTransitionStyle]}
        >
          {menuButton}
        </Animated.View>
        <View
          ref={searchBarRef}
          collapsable={false}
          style={searchBarWrapperStyle}
        >
          <ExploreSearchBar
            type="button"
            onPress={handleHeaderSearchPress}
            placeholder={strings('wallet.homepage_search_placeholder')}
            showPastePill={showSearchPastePill}
            onPastePress={handleHeaderPastePress}
            pasteButtonTestID={
              WalletViewSelectorsIDs.HOMEPAGE_SEARCH_PASTE_BUTTON
            }
          />
        </View>
      </Box>
    </HeaderRoot>
  );
};

export default memo(WalletHeader);
