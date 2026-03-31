import React, { useMemo } from 'react';
import { Pressable, ScrollView, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  AvatarToken,
  AvatarTokenSize,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import HardwareWalletTestIds from '../hardwareWallet.testIds';

interface MockAsset {
  address: string;
  balance: string;
  iconSource: ImageSourcePropType;
  kind: 'network' | 'token';
  label?: string;
  title: string;
}

export interface AccountSelectionItem {
  address: string;
  index: number;
  isExistingAccount: boolean;
  isSelected: boolean;
  totalBalance: string;
  assets: MockAsset[];
}

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

const SelectionCheckbox = ({
  isSelected,
  isDisabled,
}: {
  isSelected: boolean;
  isDisabled: boolean;
}) => {
  const tw = useTailwind();
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName={`h-6 w-6 rounded-md border ${isSelected ? 'border-muted bg-muted' : 'border-muted'} ${isDisabled ? 'opacity-70' : ''}`}
    >
      {isSelected ? <Icon name={IconName.Check} size={IconSize.Sm} /> : null}
    </Box>
  );
};

const AssetLabel = ({ label }: { label: string }) => {
  const tw = useTailwind();
  return (
    <Box twClassName="rounded px-1.5 py-0.5" style={tw.style('bg-muted')}>
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {label}
      </Text>
    </Box>
  );
};

const AccountAssetRow = ({ asset }: { asset: MockAsset }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="gap-4"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="flex-1 gap-4"
    >
      {asset.kind === 'network' ? (
        <AvatarNetwork
          name={asset.title}
          imageSource={asset.iconSource}
          size={AvatarNetworkSize.Lg}
        />
      ) : (
        <AvatarToken
          name={asset.title}
          src={asset.iconSource}
          size={AvatarTokenSize.Lg}
        />
      )}
      <Box twClassName="min-w-0 flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1.5"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {asset.title}
          </Text>
          {asset.label ? <AssetLabel label={asset.label} /> : null}
        </Box>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {asset.address}
        </Text>
      </Box>
    </Box>
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
      {asset.balance}
    </Text>
  </Box>
);

const AccountCard = ({
  account,
  onPress,
}: {
  account: AccountSelectionItem;
  onPress: () => void;
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      testID={`${HardwareWalletTestIds.ACCOUNT_CARD}-${account.index}`}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: account.isSelected,
        disabled: account.isExistingAccount,
      }}
      disabled={account.isExistingAccount}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Box
          twClassName="rounded-xl border bg-muted px-4 py-3"
          style={tw.style(
            pressed && !account.isExistingAccount && 'opacity-90',
          )}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box twClassName="flex-1 pr-3">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {`Account ${account.index + 1}`}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {account.totalBalance}
              </Text>
            </Box>
            <SelectionCheckbox
              isSelected={account.isSelected}
              isDisabled={account.isExistingAccount}
            />
          </Box>

          <Box twClassName="mt-3 border-t border-muted pt-3">
            <Box twClassName="gap-3">
              {account.assets.map((asset) => (
                <AccountAssetRow
                  key={`${account.index}-${asset.title}-${asset.address}-${asset.label ?? 'base'}`}
                  asset={asset}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Pressable>
  );
};

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
