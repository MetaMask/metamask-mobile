import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  AvatarAccount,
  AvatarAccountSize,
  BadgeStatus,
  BadgeStatusStatus,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonAnimated,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  HeaderStandardAnimated,
  IconColor as MMDSIconColor,
  IconName as MMDSIconName,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  getAvatarAccountVariant,
  type AccountAvatarVariant,
} from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';
import {
  useNativeHeader,
  useNativeHeaderInset,
} from '../../../../hooks/useNativeHeader';

interface TouchAreaSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface WalletHeaderCompactProps {
  accountAddress: string;
  avatarAccountType: AccountAvatarVariant;
  displayName: string;
  handleRewardsPress: () => void;
  handleAccountHubPress: () => void;
  touchAreaSlop: TouchAreaSlop;
  scrollY: SharedValue<number>;
  titleSectionHeight: SharedValue<number>;
  /** Set when the NavBar's trailing button opens the trade tray instead of search. */
  handleSearchPress?: () => void;
}

const styles = StyleSheet.create({
  badgeWrapperCenter: { alignSelf: 'center' },
});

type WalletHeaderAccountButtonProps = Pick<
  WalletHeaderCompactProps,
  | 'accountAddress'
  | 'avatarAccountType'
  | 'displayName'
  | 'handleAccountHubPress'
  | 'touchAreaSlop'
> & {
  /** Off inside the native bar, which already draws a glass capsule. */
  hasBackground?: boolean;
};

const WalletHeaderAccountButton = ({
  accountAddress,
  avatarAccountType,
  displayName,
  handleAccountHubPress,
  touchAreaSlop,
  hasBackground = true,
}: WalletHeaderAccountButtonProps) => {
  const hasAccountsMenuAttention = useAccountsMenuAttention();

  return (
    <ButtonAnimated
      onPress={handleAccountHubPress}
      testID={WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON}
      hitSlop={touchAreaSlop}
      accessibilityRole="button"
      accessibilityLabel={displayName}
    >
      <Box
        twClassName={`h-10 w-10 items-center justify-center rounded-full ${
          hasBackground ? 'bg-section' : ''
        }`}
      >
        <BadgeWrapper
          style={styles.badgeWrapperCenter}
          position={BadgeWrapperPosition.BottomRight}
          positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
          badge={
            hasAccountsMenuAttention ? (
              <BadgeStatus
                status={BadgeStatusStatus.Attention}
                testID={WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON_BADGE}
              />
            ) : null
          }
        >
          <AvatarAccount
            address={accountAddress}
            variant={getAvatarAccountVariant(avatarAccountType)}
            size={AvatarAccountSize.Sm}
          />
        </BadgeWrapper>
      </Box>
    </ButtonAnimated>
  );
};

const WalletHeaderAccountName = ({
  displayName,
  handleAccountHubPress,
  touchAreaSlop,
}: Pick<
  WalletHeaderCompactProps,
  'displayName' | 'handleAccountHubPress' | 'touchAreaSlop'
>) => (
  <ButtonAnimated
    onPress={handleAccountHubPress}
    hitSlop={touchAreaSlop}
    accessibilityRole="button"
    accessibilityLabel={displayName}
    testID={WalletViewSelectorsIDs.WALLET_HEADER_ACCOUNT_NAME_BUTTON}
  >
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Bold}
      numberOfLines={1}
    >
      {displayName}
    </Text>
  </ButtonAnimated>
);

/**
 * iOS 26 native bar for the compact wallet header. Returns whether it is on, so
 * the caller can skip rendering `WalletHeaderCompact`.
 */
export const useWalletHeaderCompactNativeHeader = ({
  accountAddress,
  avatarAccountType,
  displayName,
  handleRewardsPress,
  handleAccountHubPress,
  touchAreaSlop,
  scrollY,
  titleSectionHeight,
  handleSearchPress,
  isEnabled,
}: WalletHeaderCompactProps & { isEnabled: boolean }): boolean => {
  // Content scrolls under the bar, so offsets start at -inset; add it back so
  // the name appears when the in-content name passes under the bar.
  const barInset = useNativeHeaderInset();
  const titleProgress = useSharedValue(0);
  useAnimatedReaction(
    () =>
      titleSectionHeight.value > 0 &&
      scrollY.value + barInset >= titleSectionHeight.value,
    (isVisible, wasVisible) => {
      if (isVisible === wasVisible) return;
      titleProgress.value = withTiming(isVisible ? 1 : 0, {
        duration: AnimationDuration.Fast,
      });
    },
  );
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleProgress.value,
    transform: [{ translateY: (1 - titleProgress.value) * 8 }],
  }));

  const renderTitle = useCallback(
    () => (
      <Animated.View style={titleStyle}>
        <WalletHeaderAccountName
          displayName={displayName}
          handleAccountHubPress={handleAccountHubPress}
          touchAreaSlop={touchAreaSlop}
        />
      </Animated.View>
    ),
    [titleStyle, displayName, handleAccountHubPress, touchAreaSlop],
  );
  const leftItems = useCallback(
    (): NativeStackHeaderItem[] => [
      {
        type: 'custom',
        element: (
          <WalletHeaderAccountButton
            accountAddress={accountAddress}
            avatarAccountType={avatarAccountType}
            displayName={displayName}
            handleAccountHubPress={handleAccountHubPress}
            touchAreaSlop={touchAreaSlop}
            hasBackground={false}
          />
        ),
      },
    ],
    [
      accountAddress,
      avatarAccountType,
      displayName,
      handleAccountHubPress,
      touchAreaSlop,
    ],
  );
  const rightItems = useCallback((): NativeStackHeaderItem[] => {
    const giftItem: NativeStackHeaderItem = {
      type: 'button',
      label: strings('wallet.rewards_accessibility_label'),
      icon: { type: 'sfSymbol', name: 'gift' },
      onPress: handleRewardsPress,
    };
    if (!handleSearchPress) {
      return [giftItem];
    }
    return [
      giftItem,
      {
        type: 'button',
        label: strings('wallet.search_accessibility_label'),
        icon: { type: 'sfSymbol', name: 'magnifyingglass' },
        onPress: handleSearchPress,
      },
    ];
  }, [handleRewardsPress, handleSearchPress]);

  return useNativeHeader({
    title: displayName,
    renderTitle,
    leftItems,
    rightItems,
    isBackButtonHidden: true,
    isEnabled,
  });
};

const WalletHeaderCompact = ({
  accountAddress,
  avatarAccountType,
  displayName,
  handleRewardsPress,
  handleAccountHubPress,
  touchAreaSlop,
  scrollY,
  titleSectionHeight,
  handleSearchPress,
}: WalletHeaderCompactProps) => (
  <HeaderStandardAnimated
    testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
    title={
      <WalletHeaderAccountName
        displayName={displayName}
        handleAccountHubPress={handleAccountHubPress}
        touchAreaSlop={touchAreaSlop}
      />
    }
    scrollY={scrollY}
    titleSectionHeight={titleSectionHeight}
    startAccessory={
      <WalletHeaderAccountButton
        accountAddress={accountAddress}
        avatarAccountType={avatarAccountType}
        displayName={displayName}
        handleAccountHubPress={handleAccountHubPress}
        touchAreaSlop={touchAreaSlop}
      />
    }
    endAccessory={
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <ButtonIcon
          iconProps={{
            color: MMDSIconColor.IconDefault,
          }}
          onPress={handleRewardsPress}
          iconName={MMDSIconName.Gift}
          size={ButtonIconSize.Md}
          testID={WalletViewSelectorsIDs.WALLET_REWARDS_BUTTON}
          accessibilityLabel={strings('wallet.rewards_accessibility_label')}
          hitSlop={touchAreaSlop}
        />
        {handleSearchPress ? (
          <ButtonIcon
            iconProps={{
              color: MMDSIconColor.IconDefault,
            }}
            onPress={handleSearchPress}
            iconName={MMDSIconName.Search}
            size={ButtonIconSize.Md}
            testID={WalletViewSelectorsIDs.WALLET_SEARCH_BUTTON}
            accessibilityLabel={strings('wallet.search_accessibility_label')}
            hitSlop={touchAreaSlop}
          />
        ) : null}
      </Box>
    }
    twClassName="pl-4 pr-3"
  />
);

export default memo(WalletHeaderCompact);
