import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Checkbox,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { parseCaipAccountId, type CaipAccountId } from '@metamask/utils';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { getAvatarAccountVariant } from '../../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { useLinkableSocialAccounts } from '../../hooks/useLinkableSocialAccounts';
import ManageProfileScreenChrome from '../components/ManageProfileScreenChrome';
import { ManageProfileLinkedAccountSelectorsIDs } from '../ManageProfileView.testIds';
import { useProfileController } from '../hooks/useProfileController';
import { useManageProfileAnalytics } from '../../../../../hooks/useManageProfileAnalytics';

const getLinkedEvmAddress = (linkedAddress: string): string | undefined => {
  try {
    const { address, chainId } = parseCaipAccountId(
      linkedAddress as CaipAccountId,
    );
    return chainId.startsWith('eip155:') ? address : undefined;
  } catch {
    return undefined;
  }
};

const ManageProfileLinkedAccountView: React.FC = () => {
  const accounts = useLinkableSocialAccounts();
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = getAvatarAccountVariant(avatarAccountType);
  const { isControllerBacked, linkedAddresses, updateProfile } =
    useProfileController();
  const trackProfileEdited = useManageProfileAnalytics();
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The stored order is not guaranteed, so take the first EVM entry wherever
  // it sits; that is the address each row is matched on.
  const linkedAddress = linkedAddresses
    .map(getLinkedEvmAddress)
    .find((address) => address !== undefined);
  const selectedAccountId = isControllerBacked
    ? accounts.find(
        (account) =>
          account.address.toLowerCase() === linkedAddress?.toLowerCase(),
      )?.id
    : selectedAccount?.id;

  const handleAccountPress = useCallback(
    async (nextLinkedAddresses: CaipAccountId[]): Promise<void> => {
      if (!isControllerBacked) {
        return;
      }

      setIsUpdating(true);
      setErrorMessage(null);

      try {
        await updateProfile({ linked_addresses: nextLinkedAddresses });
        trackProfileEdited();
      } catch {
        setErrorMessage(
          strings('social_leaderboard.manage_profile.save_error'),
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [isControllerBacked, trackProfileEdited, updateProfile],
  );

  return (
    <ManageProfileScreenChrome
      title={strings('social_leaderboard.manage_profile.linked_social_account')}
      testID={ManageProfileLinkedAccountSelectorsIDs.CONTAINER}
      headerTestID={ManageProfileLinkedAccountSelectorsIDs.HEADER}
      backTestID={ManageProfileLinkedAccountSelectorsIDs.BACK_BUTTON}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Box twClassName="mx-4 mt-2 bg-muted rounded-2xl overflow-hidden">
          {accounts.map((account, index) => {
            const isSelected = selectedAccountId === account.id;

            return (
              <Pressable
                key={account.id}
                accessibilityRole="button"
                disabled={!isControllerBacked || isUpdating}
                onPress={() => handleAccountPress(account.linkedAddresses)}
                testID={`${ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}-${account.id}`}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                  twClassName={`px-4 py-3 ${
                    index > 0 ? 'border-t border-muted' : ''
                  }`}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="flex-1 min-w-0 mr-3"
                    gap={3}
                  >
                    <AvatarAccount
                      address={account.address}
                      size={AvatarAccountSize.Md}
                      variant={avatarVariant}
                    />
                    <Box twClassName="flex-1 min-w-0">
                      <Text variant={TextVariant.BodyMd} numberOfLines={1}>
                        {account.name}
                      </Text>
                      {account.balanceLabel ? (
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.TextAlternative}
                          numberOfLines={1}
                        >
                          {account.balanceLabel}
                        </Text>
                      ) : null}
                    </Box>
                  </Box>
                  <Checkbox
                    isSelected={isSelected}
                    pointerEvents="none"
                    onChange={() => {
                      void handleAccountPress(account.linkedAddresses);
                    }}
                  />
                </Box>
              </Pressable>
            );
          })}
        </Box>
        {errorMessage ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="mx-4 mt-3"
          >
            {errorMessage}
          </Text>
        ) : null}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="mx-4 mt-4 px-3 py-3 rounded-2xl border border-muted"
          gap={1}
        >
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
            twClassName="mt-0.5"
          />
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="flex-1"
          >
            {strings(
              'social_leaderboard.manage_profile.linked_account_footnote',
            )}
          </Text>
        </Box>
      </ScrollView>
    </ManageProfileScreenChrome>
  );
};

export default ManageProfileLinkedAccountView;
