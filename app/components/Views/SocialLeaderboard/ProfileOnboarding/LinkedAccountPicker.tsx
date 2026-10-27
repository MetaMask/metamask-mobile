import {
  AvatarAccount,
  AvatarAccountSize,
  BottomSheetDialog,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  Switch,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { useTheme } from '../../../../util/theme';
import type { LinkableSocialAccount } from '../hooks/useLinkableSocialAccounts';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  accountList: {
    maxHeight: 420,
  },
});

const BENEFIT_KEYS = [
  'social_leaderboard.profile_onboarding.link_account_benefit_trades',
  'social_leaderboard.profile_onboarding.link_account_benefit_fees',
  'social_leaderboard.profile_onboarding.link_account_benefit_private',
  'social_leaderboard.profile_onboarding.link_account_benefit_follow',
] as const;

interface LinkedAccountPickerProps {
  accounts: LinkableSocialAccount[];
  selectedAccountId: string | null;
  shareTradingActivity: boolean;
  onSelect: (account: LinkableSocialAccount) => void;
  onShareTradingActivityChange: (shareTradingActivity: boolean) => void;
}

/**
 * Account step controls: the linked-account dropdown, the trading-activity
 * switch, and the benefit list. The sheet is built from BottomSheetDialog
 * and ListItemSelect.
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
      <Box gap={4}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings(
            'social_leaderboard.profile_onboarding.select_account',
          )}
          onPress={() => setIsSheetOpen(true)}
          testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_SELECTOR}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="bg-muted rounded-xl px-4 py-3"
            gap={3}
          >
            {selectedAccount ? (
              <AvatarAccount
                address={selectedAccount.address}
                size={AvatarAccountSize.Md}
                variant={avatarVariant}
              />
            ) : null}
            <Box twClassName="flex-1 min-w-0">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                numberOfLines={1}
              >
                {selectedAccount?.name ??
                  strings(
                    'social_leaderboard.profile_onboarding.select_account',
                  )}
              </Text>
              {selectedAccount?.balanceLabel ? (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {selectedAccount.balanceLabel}
                </Text>
              ) : null}
            </Box>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Box>
        </Pressable>

        <Box twClassName="bg-muted rounded-xl px-4 py-3">
          <Switch
            isOn={shareTradingActivity}
            onValueChange={onShareTradingActivityChange}
            label={strings(
              'social_leaderboard.manage_profile.show_trading_activity',
            )}
            testID={SocialProfileOnboardingSelectorsIDs.SHARE_ACTIVITY_SWITCH}
          />
        </Box>

        <Box gap={3}>
          {BENEFIT_KEYS.map((key) => (
            <Box
              key={key}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              gap={3}
            >
              <Icon
                name={IconName.Check}
                size={IconSize.Md}
                color={IconColor.SuccessDefault}
              />
              <Text variant={TextVariant.BodyMd} twClassName="flex-1">
                {strings(key)}
              </Text>
            </Box>
          ))}
        </Box>
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
