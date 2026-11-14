import {
  AvatarAccount,
  AvatarAccountSize,
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { useTheme } from '../../../../util/theme';
import type { LinkableSocialAccount } from '../hooks/useLinkableSocialAccounts';
import TradingActivityBenefits from '../shared/TradingActivityBenefits';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  accountList: {
    maxHeight: 420,
  },
});

interface LinkedAccountPickerProps {
  accounts: LinkableSocialAccount[];
  selectedAccountId: string | null;
  shareTradingActivity: boolean;
  onSelect: (account: LinkableSocialAccount) => void;
  onShareTradingActivityChange: (shareTradingActivity: boolean) => void;
}

/**
 * Account step controls: a grouped card with the linked account and the
 * trading-activity switch, then the benefit list. The sheet is built from
 * BottomSheetDialog and ListItemSelect.
 */
const LinkedAccountPicker: React.FC<LinkedAccountPickerProps> = ({
  accounts,
  selectedAccountId,
  shareTradingActivity,
  onSelect,
  onShareTradingActivityChange,
}) => {
  const { colors } = useTheme();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = getAvatarAccountVariant(avatarAccountType);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? accounts[0];
  // Design-system Switch copies `label` into accessibilityLabel and ignores a
  // passed accessibilityLabel. This row keeps its own text so the label can
  // fill the row, and the native switch carries the accessible name.
  const tradingActivityLabel = strings(
    'social_leaderboard.manage_profile.show_trading_activity',
  );
  const linkedAccountLabel = strings(
    'social_leaderboard.profile_onboarding.linked_account',
  );
  const selectedAccountName =
    selectedAccount?.name ??
    strings('social_leaderboard.profile_onboarding.select_account');

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
  }, []);

  const handleSelect = useCallback(
    (account: LinkableSocialAccount) => {
      onSelect(account);
      setIsSheetOpen(false);
    },
    [onSelect],
  );

  return (
    <Box twClassName="flex-1">
      <Box gap={3}>
        <Box twClassName="bg-muted rounded-2xl overflow-hidden mb-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${linkedAccountLabel}, ${selectedAccountName}`}
            onPress={() => setIsSheetOpen(true)}
            testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_SELECTOR}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="pl-4 pr-3 h-14"
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                twClassName="flex-1 mr-2"
              >
                {linkedAccountLabel}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-shrink min-w-0"
                gap={2}
              >
                {selectedAccount ? (
                  <AvatarAccount
                    address={selectedAccount.address}
                    size={AvatarAccountSize.Sm}
                    variant={avatarVariant}
                  />
                ) : null}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  numberOfLines={1}
                  twClassName="flex-shrink"
                >
                  {selectedAccountName}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </Box>
            </Box>
          </Pressable>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="border-t border-muted pl-4 pr-3 h-14"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              twClassName="flex-1 mr-2"
            >
              {tradingActivityLabel}
            </Text>
            {/* The native switch draws at the top of a stretched frame. A 32px
                slot matches the control, and the row centers that slot on the label. */}
            <Box twClassName="h-8 items-center justify-center">
              <Switch
                value={shareTradingActivity}
                onValueChange={onShareTradingActivityChange}
                accessibilityRole="switch"
                accessibilityLabel={tradingActivityLabel}
                accessibilityState={{ checked: shareTradingActivity }}
                testID={
                  SocialProfileOnboardingSelectorsIDs.SHARE_ACTIVITY_SWITCH
                }
              />
            </Box>
          </Box>
        </Box>

        <TradingActivityBenefits
          isTradingActivityShown={shareTradingActivity}
          testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_BENEFITS}
        />
      </Box>

      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mt-auto text-center"
        testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_CHANGE_FOOTNOTE}
      >
        {strings(
          'social_leaderboard.profile_onboarding.link_account_change_footnote',
        )}
      </Text>

      {isSheetOpen ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeSheet}
        >
          <SafeAreaProvider>
            <GestureHandlerRootView style={styles.root}>
              <Box twClassName="absolute inset-0">
                <Pressable
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: colors.overlay.default },
                  ]}
                  onPress={closeSheet}
                  accessibilityRole="button"
                  testID={
                    SocialProfileOnboardingSelectorsIDs.ACCOUNT_SHEET_BACKDROP
                  }
                />
                <BottomSheetDialog
                  onClose={closeSheet}
                  testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_SHEET}
                >
                  <BottomSheetHeader
                    onClose={closeSheet}
                    closeButtonProps={{
                      testID:
                        SocialProfileOnboardingSelectorsIDs.ACCOUNT_SHEET_CLOSE,
                    }}
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.select_account',
                    )}
                  </BottomSheetHeader>
                  <ScrollView style={styles.accountList}>
                    {accounts.map((account) => (
                      <ListItemSelect
                        key={account.id}
                        isSelected={account.id === selectedAccount?.id}
                        showSelectedIcon
                        avatar={
                          <AvatarAccount
                            address={account.address}
                            size={AvatarAccountSize.Md}
                            variant={avatarVariant}
                          />
                        }
                        title={account.name}
                        description={account.balanceLabel || undefined}
                        onPress={() => handleSelect(account)}
                        testID={`${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-${account.id}`}
                      />
                    ))}
                  </ScrollView>
                </BottomSheetDialog>
              </Box>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </Modal>
      ) : null}
    </Box>
  );
};

export default LinkedAccountPicker;
