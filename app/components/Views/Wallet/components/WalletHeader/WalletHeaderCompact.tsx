import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
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
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ExploreSearchBar from '../../../TrendingView/components/ExploreSearchBar/ExploreSearchBar';
import {
  getAvatarAccountVariant,
  type AccountAvatarVariant,
} from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { useAccountsMenuAttention } from '../../../../hooks/useAccountsMenuAttention';
import { WalletViewSelectorsIDs } from '../../WalletView.testIds';

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
  useSearchHeaderLayout: boolean;
  showSearchPastePill: boolean;
  handleSearchPastePress: () => void;
}

const styles = StyleSheet.create({
  badgeWrapperCenter: { alignSelf: 'center' },
});

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
  useSearchHeaderLayout,
  showSearchPastePill,
  handleSearchPastePress,
}: WalletHeaderCompactProps) => {
  const hasAccountsMenuAttention = useAccountsMenuAttention();

  return (
    <HeaderStandardAnimated
      testID={WalletViewSelectorsIDs.WALLET_HEADER_ROOT}
      title={
        useSearchHeaderLayout ? (
          <ExploreSearchBar
            type="button"
            onPress={handleSearchPress ?? (() => undefined)}
            placeholder={strings('wallet.homepage_search_placeholder')}
            showPastePill={showSearchPastePill}
            onPastePress={handleSearchPastePress}
            pasteButtonTestID={
              WalletViewSelectorsIDs.HOMEPAGE_SEARCH_PASTE_BUTTON
            }
          />
        ) : (
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
        )
      }
      scrollY={scrollY}
      titleSectionHeight={titleSectionHeight}
      startAccessory={
        <ButtonAnimated
          onPress={handleAccountHubPress}
          testID={WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON}
          hitSlop={touchAreaSlop}
          accessibilityRole="button"
          accessibilityLabel={displayName}
        >
          <Box twClassName="h-10 w-10 items-center justify-center rounded-full bg-section">
            <BadgeWrapper
              style={styles.badgeWrapperCenter}
              position={BadgeWrapperPosition.BottomRight}
              positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
              badge={
                hasAccountsMenuAttention ? (
                  <BadgeStatus
                    status={BadgeStatusStatus.Attention}
                    testID={
                      WalletViewSelectorsIDs.WALLET_ACCOUNT_HUB_BUTTON_BADGE
                    }
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
          {!useSearchHeaderLayout && handleSearchPress ? (
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
};

export default memo(WalletHeaderCompact);
