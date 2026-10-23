import React, { memo, useCallback, useRef } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
  ButtonBase,
  ButtonAnimated,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  HeaderRoot,
  Icon as MMDSIcon,
  IconColor as MMDSIconColor,
  IconName as MMDSIconName,
  IconSize as MMDSIconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import PickerAccount from '../../../../../component-library/components/Pickers/PickerAccount';
import AddressCopy from '../../../../UI/AddressCopy';
import CardButton from '../../../../UI/Card/components/CardButton';
import CapsuleGlass from '../../../../../component-library/components-temp/CapsuleGlass';
import {
  formatInterimAccountName,
  INTERIM_ACCOUNT_PICKER_CLASS,
} from './useWalletHeaderNativeHeader';
import WalletHeaderInterimActions, {
  WalletHeaderMenuButton,
} from './WalletHeaderInterimActions';
import WalletHeaderProfileAvatar, {
  SOCIAL_HEADER_PROFILE_AVATAR_DIAMETER,
} from './WalletHeaderProfileAvatar';
import WalletHeaderAccountPickerRow from './WalletHeaderAccountPickerRow';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createAccountSelectorNavDetails } from '../../../AccountSelector';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { createProfileDrawerNavDetails } from '../../../SocialProfile/ProfileDrawer';
import { selectIsSocialV1Enabled } from '../../../../../selectors/featureFlagController/socialV1';
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
  handleRewardsPress?: () => void;
  handleProfilePress?: () => void;
  touchAreaSlop: TouchAreaSlop;
  headerActionButtonsContainerStyle: ViewStyle;
  headerAccountPickerStyle: ViewStyle;
  /** Interim brand refresh: header actions use Liquid Glass where available. */
  isInterimLayout?: boolean;
  isSocialLayout?: boolean;
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
  handleRewardsPress,
  handleProfilePress,
  touchAreaSlop,
  displayName,
  navigation,
  headerActionButtonsContainerStyle,
  headerAccountPickerStyle,
  isInterimLayout = false,
  isSocialLayout = false,
}: WalletHeaderProps) => {
  const tw = useTailwind();
  const hasAccountsMenuAttention = useAccountsMenuAttention();
  const searchBarRef = useRef<View>(null);
  const isSocialV1Enabled = useSelector(selectIsSocialV1Enabled);

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
    if (isSocialV1Enabled) {
      (navigation as NavigationProp<ParamListBase>).navigate(
        ...createProfileDrawerNavDetails({}),
      );
      return;
    }
    (navigation as NavigationProp<ParamListBase>).navigate(
      ...createAccountSelectorNavDetails({}),
    );
  }, [navigation, isSocialV1Enabled]);

  const handleAccountSelectorPress = useCallback(() => {
    (navigation as NavigationProp<ParamListBase>).navigate(
      ...createAccountSelectorNavDetails({}),
    );
  }, [navigation]);

  const accountPickerRow =
    isSocialV1Enabled && !useSearchHeaderLayout ? (
      <WalletHeaderAccountPickerRow
        displayName={displayName}
        onPress={handleAccountSelectorPress}
        hitSlop={touchAreaSlop}
      />
    ) : null;

  const withAccountPickerRow = (header: React.ReactElement) =>
    accountPickerRow ? (
      <View testID={WalletViewSelectorsIDs.WALLET_HEADER_WITH_ACCOUNT_PICKER}>
        {header}
        {accountPickerRow}
      </View>
    ) : (
      header
    );

  const pickerAccountName = isInterimLayout
    ? formatInterimAccountName(displayName)
    : displayName;

  const socialV1AccountButton = (
    <ButtonBase
      onPress={handleAccountPickerPress}
      testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
      accessibilityRole="button"
      accessibilityLabel={displayName}
      hitSlop={touchAreaSlop}
      twClassName="h-10 w-10 rounded-full bg-transparent p-0"
    >
      <WalletHeaderProfileAvatar />
    </ButtonBase>
  );

  const accountPicker = (
    <View style={accountPickerContainerStyle}>
      {isSocialV1Enabled ? (
        socialV1AccountButton
      ) : (
        <PickerAccount
          accountName={pickerAccountName}
          onPress={handleAccountPickerPress}
          testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
          hitSlop={touchAreaSlop}
          style={headerAccountPickerStyle}
        />
      )}
    </View>
  );

  const socialAccountPicker = (
    <View style={accountPickerContainerStyle}>
      <CapsuleGlass
        twClassName="mr-4 max-w-full self-start"
        nonGlassClassName="px-1"
        testID={WalletViewSelectorsIDs.WALLET_HEADER_ACCOUNT_PICKER_CAPSULE}
      >
        <ButtonAnimated
          onPress={handleAccountSelectorPress}
          testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
          hitSlop={touchAreaSlop}
          accessibilityRole="button"
          accessibilityLabel={displayName}
          style={tw.style('shrink')}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1 pl-4 pr-3"
          >
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Regular}
              numberOfLines={1}
              twClassName="shrink"
              testID={WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT}
            >
              {displayName}
            </Text>
            <MMDSIcon
              name={MMDSIconName.ArrowDown}
              size={MMDSIconSize.Md}
              color={MMDSIconColor.IconAlternative}
            />
          </Box>
        </ButtonAnimated>
      </CapsuleGlass>
    </View>
  );

  if (isInterimLayout && isSocialLayout && !useSearchHeaderLayout) {
    const socialActions = (
      <CapsuleGlass
        twClassName="shrink-0 px-2"
        testID={WalletViewSelectorsIDs.WALLET_HEADER_ACTIONS_CAPSULE}
      >
        <WalletHeaderInterimActions
          isMoneyAccountVisible={isMoneyAccountVisible}
          handleActivityPress={handleActivityPress}
          handleSearchPress={handleSearchPress}
          handleRewardsPress={handleRewardsPress}
          isSocialLayout
          handleHamburgerPress={handleHamburgerPress}
          touchAreaSlop={touchAreaSlop}
        />
      </CapsuleGlass>
    );

    return (
      <Box
        testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName="h-14 px-3"
      >
        <CapsuleGlass twClassName="h-10 w-10 shrink-0 justify-center">
          <ButtonBase
            onPress={() => handleProfilePress?.()}
            testID={WalletViewSelectorsIDs.PROFILE_BUTTON}
            accessibilityRole="button"
            accessibilityLabel={strings(
              'social_leaderboard.my_profile.open_profile',
            )}
            hitSlop={touchAreaSlop}
            twClassName="h-10 w-10 items-center justify-center rounded-full bg-transparent p-0"
          >
            <WalletHeaderProfileAvatar
              diameter={SOCIAL_HEADER_PROFILE_AVATAR_DIAMETER}
            />
          </ButtonBase>
        </CapsuleGlass>
        {socialAccountPicker}
        {socialActions}
      </Box>
    );
  }

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

    return withAccountPickerRow(
      <HeaderRoot
        testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
        endAccessory={
          <CapsuleGlass
            twClassName="px-2"
            nonGlassClassName="px-3"
            testID={WalletViewSelectorsIDs.WALLET_HEADER_ACTIONS_CAPSULE}
          >
            {interimActions}
          </CapsuleGlass>
        }
        twClassName="pl-3 pr-3"
      >
        <View style={accountPickerContainerStyle}>
          <CapsuleGlass
            twClassName="mr-4 max-w-full self-start"
            nonGlassClassName="px-1"
            testID={WalletViewSelectorsIDs.WALLET_HEADER_ACCOUNT_PICKER_CAPSULE}
          >
            {isSocialV1Enabled ? (
              socialV1AccountButton
            ) : (
              <PickerAccount
                accountName={pickerAccountName}
                onPress={handleAccountPickerPress}
                testID={WalletViewSelectorsIDs.ACCOUNT_ICON}
                hitSlop={touchAreaSlop}
                style={tw.style(INTERIM_ACCOUNT_PICKER_CLASS)}
              />
            )}
          </CapsuleGlass>
        </View>
      </HeaderRoot>,
    );
  }

  if (!useSearchHeaderLayout) {
    return withAccountPickerRow(
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
      </HeaderRoot>,
    );
  }

  return withAccountPickerRow(
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
    </HeaderRoot>,
  );
};
export default memo(WalletHeader);
