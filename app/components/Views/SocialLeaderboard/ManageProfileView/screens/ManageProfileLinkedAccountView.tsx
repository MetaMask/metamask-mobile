import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { parseCaipAccountId, type CaipAccountId } from '@metamask/utils';
import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { useLinkableSocialAccounts } from '../../hooks/useLinkableSocialAccounts';
import SocialAccountSectionList from '../../shared/SocialAccountSectionList';
import ManageProfileScreenChrome from '../components/ManageProfileScreenChrome';
import { ManageProfileLinkedAccountSelectorsIDs } from '../ManageProfileView.testIds';
import { useProfileController } from '../hooks/useProfileController';
import { getLinkedAccountUpdateError } from './linkedAccountUpdateError';
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
  const { isControllerBacked, linkedAddresses, updateProfile } =
    useProfileController();
  const trackProfileEdited = useManageProfileAnalytics();
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(errorMessage);
  }, [errorMessage]);

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
      } catch (error) {
        setErrorMessage(
          getLinkedAccountUpdateError(error) ??
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
        <Box twClassName="mt-2">
          <SocialAccountSectionList
            accounts={accounts}
            disabled={!isControllerBacked || isUpdating}
            onSelect={(account) => {
              handleAccountPress(account.linkedAddresses);
            }}
            rowTestIdPrefix={ManageProfileLinkedAccountSelectorsIDs.ACCOUNT_ROW}
            selectedAccountId={selectedAccountId}
          />
        </Box>
        {errorMessage ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
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
