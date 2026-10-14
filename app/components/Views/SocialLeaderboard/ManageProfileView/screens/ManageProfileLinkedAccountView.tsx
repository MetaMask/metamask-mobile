import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  RadioButton,
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
import {
  selectInternalEvmAccounts,
  selectSelectedInternalAccount,
} from '../../../../../selectors/accountsController';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { renderShortAddress } from '../../../../../util/address';
import ManageProfileScreenChrome from '../components/ManageProfileScreenChrome';
import { ManageProfileLinkedAccountSelectorsIDs } from '../ManageProfileView.testIds';
import { useProfileController } from '../hooks/useProfileController';

const accountLabel = (name: string | undefined, address: string): string =>
  name?.trim() ? name : renderShortAddress(address);

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
  const accounts = useSelector(selectInternalEvmAccounts);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = getAvatarAccountVariant(avatarAccountType);
  const { isControllerBacked, linkedAddresses, updateProfile } =
    useProfileController();
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const linkedAddress = linkedAddresses[0]
    ? getLinkedEvmAddress(linkedAddresses[0])
    : undefined;
  const selectedAccountId = isControllerBacked
    ? accounts.find(
        (account) =>
          account.address.toLowerCase() === linkedAddress?.toLowerCase(),
      )?.id
    : selectedAccount?.id;

  const handleAccountPress = useCallback(
    async (address: string): Promise<void> => {
      if (!isControllerBacked) {
        return;
      }

      setIsUpdating(true);
      setErrorMessage(null);

      try {
        await updateProfile({
          linked_addresses: [`eip155:1:${address}` as CaipAccountId],
        });
      } catch {
        setErrorMessage(
          strings('social_leaderboard.manage_profile.save_error'),
        );
      } finally {
        setIsUpdating(false);
      }
    },
    [isControllerBacked, updateProfile],
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
            const label = accountLabel(account.metadata.name, account.address);

            return (
              <Pressable
                key={account.id}
                accessibilityRole="button"
                disabled={!isControllerBacked || isUpdating}
                onPress={() => handleAccountPress(account.address)}
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
                    <Text
                      variant={TextVariant.BodyMd}
                      numberOfLines={1}
                      twClassName="flex-shrink"
                    >
                      {label}
                    </Text>
                  </Box>
                  <RadioButton isChecked={isSelected} isReadOnly />
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
          twClassName="mx-4 mt-4 px-3 py-3 rounded-2xl border border-muted"
          gap={2}
        >
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
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
