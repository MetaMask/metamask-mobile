import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import HardwareWalletTestIds from '../hardwareWallet.testIds';

import type { AccountSelectionItem } from './account-selection/types';
import AccountCard from './account-selection/AccountCard';

export type { AccountSelectionItem } from './account-selection/types';

interface AccountSelectionFlowProps {
  accounts: AccountSelectionItem[];
  errorMessage: string | null;
  isBusy: boolean;
  onBack: () => void;
  onContinue: () => void;
  onForget: () => void;
  onNextPage: () => void;
  onOpenSettings: () => void;
  onPrevPage: () => void;
  onToggleAccount: (accountIndex: number) => void;
}

const AccountSelectionFlow = ({
  accounts,
  errorMessage,
  isBusy,
  onBack,
  onContinue,
  onForget,
  onNextPage,
  onOpenSettings,
  onPrevPage,
  onToggleAccount,
}: AccountSelectionFlowProps) => {
  const tw = useTailwind();
  const hasSelection = useMemo(
    () =>
      accounts.some(
        (account) => account.isSelected && !account.isExistingAccount,
      ),
    [accounts],
  );

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box twClassName="flex-1 bg-default">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-1 py-2"
        >
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={onBack}
            accessibilityLabel={strings('navigation.back')}
            testID={HardwareWalletTestIds.ACCOUNT_SELECTION_BACK_BUTTON}
          />
          <ButtonIcon
            iconName={IconName.Setting}
            size={ButtonIconSize.Md}
            onPress={onOpenSettings}
            accessibilityLabel={strings('ledger.select_hd_path')}
            testID={HardwareWalletTestIds.ACCOUNT_SELECTION_SETTINGS_BUTTON}
          />
        </Box>

        <Box twClassName="flex-1 px-4">
          <Text variant={TextVariant.HeadingLg}>
            {strings('ledger.select_accounts')}
          </Text>

          {errorMessage ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.Error}
              twClassName="mt-2"
            >
              {errorMessage}
            </Text>
          ) : null}

          <ScrollView
            style={tw.style('flex-1 mt-4')}
            contentContainerStyle={tw.style('pb-6 gap-3')}
            showsVerticalScrollIndicator={false}
          >
            {accounts.map((account) => (
              <AccountCard
                key={account.index}
                account={account}
                onPress={() => onToggleAccount(account.index)}
              />
            ))}

            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="px-1 pt-1"
            >
              <Pressable
                testID={HardwareWalletTestIds.ACCOUNT_SELECTION_PREVIOUS_BUTTON}
                accessibilityRole="button"
                onPress={onPrevPage}
              >
                {({ pressed }) => (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-1"
                    style={pressed ? tw.style('opacity-70') : undefined}
                  >
                    <Icon name={IconName.ArrowLeft} size={IconSize.Sm} />
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings('account_selector.prev')}
                    </Text>
                  </Box>
                )}
              </Pressable>

              <Pressable
                testID={HardwareWalletTestIds.ACCOUNT_SELECTION_NEXT_BUTTON}
                accessibilityRole="button"
                onPress={onNextPage}
              >
                {({ pressed }) => (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-1"
                    style={pressed ? tw.style('opacity-70') : undefined}
                  >
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings('account_selector.next')}
                    </Text>
                    <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
                  </Box>
                )}
              </Pressable>
            </Box>
          </ScrollView>
        </Box>

        <Box
          twClassName="border-t-0 px-4 pb-4 pt-2"
          style={tw.style('bg-default')}
        >
          <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-4">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={onForget}
              isDisabled={isBusy}
              style={tw.style('flex-1')}
              testID={HardwareWalletTestIds.ACCOUNT_SELECTION_FORGET_BUTTON}
            >
              {strings('account_selector.forget')}
            </Button>
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              onPress={onContinue}
              isDisabled={!hasSelection || isBusy}
              style={tw.style('flex-1')}
              testID={HardwareWalletTestIds.ACCOUNT_SELECTION_CONTINUE_BUTTON}
            >
              {strings('common.continue')}
            </Button>
          </Box>
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default AccountSelectionFlow;
