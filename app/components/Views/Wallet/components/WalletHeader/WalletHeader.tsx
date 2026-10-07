import React, { memo, useCallback, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import PickerAccount from '../../../../../component-library/components/Pickers/PickerAccount';
import AddressCopy from '../../../../UI/AddressCopy';
import CardButton from '../../../../UI/Card/components/CardButton';
import { useLiquidGlass } from '../../../../../component-library/hooks/useLiquidGlass';
import { BLUR_INTENSITY } from '../../../../../component-library/hooks/useBlurMaterial';
import {
  formatInterimAccountName,
  INTERIM_ACCOUNT_PICKER_CLASS,
} from './useWalletHeaderNativeHeader';
import WalletHeaderInterimActions, {
  WalletHeaderMenuButton,
} from './WalletHeaderInterimActions';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createAccountSelectorNavDetails } from '../../../AccountSelector';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ExploreSearchBar from '../../../TrendingView/components/ExploreSearchBar/ExploreSearchBar';
import type { SearchOrigin } from '../../../../../util/homepageSearchTransition';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const searchBarWrapperStyle: ViewStyle = { flex: 1 };
const hiddenSearchBarStyle: ViewStyle = { opacity: 0 };
const accountPickerContainerStyle: ViewStyle = { flex: 1 };

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
  isSearchReturnTransitionActive?: boolean;
  showSearchPastePill: boolean;
  handleSearchPastePress: (origin?: SearchOrigin) => void;
  handleActivityPress: () => void;
  handleCardPress: () => void;
  handleHamburgerPress: () => void;
  touchAreaSlop: TouchAreaSlop;
  headerActionButtonsContainerStyle: ViewStyle;
  headerAccountPickerStyle: ViewStyle;
  /** Interim brand refresh: Activity, Search and Menu only, on Liquid Glass where available. */
  isInterimLayout?: boolean;
}

const WalletHeader = ({
  isMoneyAccountVisible,
  handleSearchPress,
  showSearchPastePill,
  handleSearchPastePress,
  useSearchHeaderLayout,
  isSearchReturnTransitionActive = false,
  handleActivityPress,
  handleCardPress,
  handleHamburgerPress,
  touchAreaSlop,
  displayName,
  navigation,
  headerActionButtonsContainerStyle,
  headerAccountPickerStyle,
  isInterimLayout = false,
}: WalletHeaderProps) => {
  const tw = useTailwind();
  const hasAccountsMenuAttention = useAccountsMenuAttention();
  const { isGlassEnabled, glassColorScheme, isBlurEnabled, blurTint } =
    useLiquidGlass();
  const searchBarRef = useRef<View>(null);

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
      <WalletHeaderMenuButton
        handleHamburgerPress={handleHamburgerPress}
        touchAreaSlop={touchAreaSlop}
      />
    </Box>
  );

  const startSearchTransition = useCallback(
    (callback: (origin?: SearchOrigin) => void) => {
      measureSearchOrigin(callback);
    },
    [measureSearchOrigin],
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

  const pickerAccountName = isInterimLayout
    ? formatInterimAccountName(displayName)
    : displayName;

  const accountPicker = (
    <View style={accountPickerContainerStyle}>
      <PickerAccount
        accountName={pickerAccountName}
        onPress={handleAccountPickerPress}
        testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
        hitSlop={touchAreaSlop}
        style={headerAccountPickerStyle}
      />
    </View>
  );

  if (isInterimLayout && !useSearchHeaderLayout) {
    const interimActions = (
      <WalletHeaderInterimActions
        isMoneyAccountVisible={isMoneyAccountVisible}
        handleActivityPress={handleActivityPress}
        handleSearchPress={handleSearchPress}
        handleHamburgerPress={handleHamburgerPress}
        touchAreaSlop={touchAreaSlop}
      />
    );

    const capsuleClass =
      'h-11 flex-row items-center overflow-hidden rounded-full';

    const renderCapsule = ({
      content,
      layoutClass,
      paddingClass,
      glassTestID,
      blurTestID,
      fallbackTestID,
    }: {
      content: React.ReactNode;
      /** Outer layout, e.g. margins and alignment. */
      layoutClass: string;
      paddingClass: string;
      glassTestID: string;
      blurTestID: string;
      fallbackTestID: string;
    }) =>
      isGlassEnabled ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme={glassColorScheme}
          isInteractive
          // The native glass only takes the capsule's corners when clipped.
          style={tw.style(capsuleClass, layoutClass, paddingClass)}
          testID={glassTestID}
        >
          {content}
        </GlassView>
      ) : isBlurEnabled ? (
        // Older iOS has no glass, so the capsule blurs the content behind it.
        <BlurView
          tint={blurTint}
          intensity={BLUR_INTENSITY}
          style={tw.style(
            capsuleClass,
            'border border-muted',
            layoutClass,
            paddingClass,
          )}
          testID={blurTestID}
        >
          {content}
        </BlurView>
      ) : (
        // Where the OS can't draw glass, a flat opaque capsule keeps the shape
        // and stays legible over content scrolling beneath the header.
        <View
          style={tw.style(
            capsuleClass,
            'bg-section border border-muted',
            layoutClass,
            paddingClass,
          )}
          testID={fallbackTestID}
        >
          {content}
        </View>
      );

    return (
      <HeaderRoot
        testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
        endAccessory={renderCapsule({
          content: interimActions,
          layoutClass: '',
          paddingClass: isGlassEnabled ? 'px-2' : 'px-3',
          glassTestID: WalletViewSelectorsIDs.WALLET_HEADER_GLASS_ACTIONS,
          blurTestID: WalletViewSelectorsIDs.WALLET_HEADER_BLUR_ACTIONS,
          fallbackTestID: WalletViewSelectorsIDs.WALLET_HEADER_CAPSULE_ACTIONS,
        })}
        twClassName="pl-3 pr-3"
      >
        <View style={accountPickerContainerStyle}>
          {renderCapsule({
            content: (
              <PickerAccount
                accountName={pickerAccountName}
                onPress={handleAccountPickerPress}
                testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
                hitSlop={touchAreaSlop}
                style={tw.style(INTERIM_ACCOUNT_PICKER_CLASS)}
              />
            ),
            layoutClass: 'mr-4 max-w-full self-start',
            paddingClass: isGlassEnabled ? '' : 'px-1',
            glassTestID:
              WalletViewSelectorsIDs.WALLET_HEADER_GLASS_ACCOUNT_PICKER,
            blurTestID:
              WalletViewSelectorsIDs.WALLET_HEADER_BLUR_ACCOUNT_PICKER,
            fallbackTestID:
              WalletViewSelectorsIDs.WALLET_HEADER_CAPSULE_ACCOUNT_PICKER,
          })}
        </View>
      </HeaderRoot>
    );
  }

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
        {accountPicker}
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
        </Box>
      }
      twClassName="pl-3 pr-3 gap-2"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="h-12 flex-1 gap-2"
      >
        {menuButton}
        <View
          ref={searchBarRef}
          collapsable={false}
          style={[
            searchBarWrapperStyle,
            isSearchReturnTransitionActive && hiddenSearchBarStyle,
          ]}
          pointerEvents={isSearchReturnTransitionActive ? 'none' : 'auto'}
          accessibilityElementsHidden={isSearchReturnTransitionActive}
          importantForAccessibility={
            isSearchReturnTransitionActive ? 'no-hide-descendants' : 'auto'
          }
        >
          <ExploreSearchBar
            type="button"
            onPress={handleHeaderSearchPress}
            placeholder={strings('wallet.homepage_search_placeholder')}
            showPastePill={showSearchPastePill}
            onPastePress={handleHeaderPastePress}
            clipboardButtonTestID={
              WalletViewSelectorsIDs.HOMEPAGE_SEARCH_CLIPBOARD_BUTTON
            }
          />
        </View>
      </Box>
    </HeaderRoot>
  );
};

export default memo(WalletHeader);
