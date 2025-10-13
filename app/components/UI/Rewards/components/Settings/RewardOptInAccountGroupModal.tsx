import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { AccountGroupId } from '@metamask/account-api';
import { renderSlightlyLongAddress } from '../../../../../util/address';
import NetworkAvatars from './NetworkAvatars';
import { selectAccountGroupById } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { strings } from '../../../../../../locales/i18n';
import { useLinkAccountGroup } from '../../hooks/useLinkAccountGroup';

interface RouteParams {
  accountGroupId: AccountGroupId;
  addressData: AddressItem[];
}

interface AddressItem {
  address: string;
  hasOptedIn: boolean;
  scopes: string[];
}

const RewardOptInAccountGroupModal: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { accountGroupId, addressData } = route.params as RouteParams;
  const tw = useTailwind();
  const accountGroupContext = useSelector((state: RootState) =>
    selectAccountGroupById(state, accountGroupId),
  );
  const { linkAccountGroup, isLoading } = useLinkAccountGroup();
  const evmAddress = useSelector((state: RootState) =>
    selectIconSeedAddressByAccountGroupId(accountGroupId)(state),
  );
  const sheetRef = useRef<BottomSheetRef>(null);
  const avatarAccountType = useSelector(selectAvatarAccountType);

  // Local state to track succeeded/failed accounts from linkAccountGroup operations
  const [localAccountStatuses, setLocalAccountStatuses] = useState<
    Record<string, boolean>
  >({});

  const handleDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Computed address data that merges local statuses with original addressData
  const computedAddressData = useMemo(
    () =>
      addressData.map((item) => ({
        ...item,
        hasOptedIn: localAccountStatuses[item.address] ?? item.hasOptedIn,
      })),
    [addressData, localAccountStatuses],
  );

  const handleLinkAccountGroup = useCallback(async () => {
    try {
      const result = await linkAccountGroup(accountGroupId);
      // Update local state with the results from linkAccountGroup
      setLocalAccountStatuses((prev) => ({
        ...prev,
        ...result.byAddress,
      }));
    } catch (error) {
      // Error handling is already done in the hook
      console.error('Failed to link account group:', error);
    }
  }, [linkAccountGroup, accountGroupId]);

  const renderAddressItem = useCallback(
    ({ item }: { item: AddressItem }) => (
      <Box
        testID={`flat-list-item-${item.address}`}
        twClassName="flex-row items-center justify-between px-4 py-4 rounded-lg border bg-background-muted border-muted mb-2"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1"
        >
          <Icon
            name={item.hasOptedIn ? IconName.Check : IconName.Close}
            color={item.hasOptedIn ? IconColor.Success : IconColor.Error}
          />

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="flex-1 ml-3 gap-2"
          >
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {renderSlightlyLongAddress(item.address)}
            </Text>

            <NetworkAvatars
              scopes={item.scopes}
              maxVisible={3}
              testID={`network-avatars-${item.address}`}
            />
          </Box>
        </Box>
      </Box>
    ),
    [],
  );

  const optedOutAddresses = useMemo(
    () => computedAddressData?.filter((item) => !item.hasOptedIn) ?? [],
    [computedAddressData],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={handleDismiss}
    >
      {Boolean(accountGroupContext?.metadata?.name) && (
        <BottomSheetHeader
          startAccessory={
            <AvatarAccount
              accountAddress={
                evmAddress || '0x0000000000000000000000000000000000000000'
              }
              type={avatarAccountType}
              size={AvatarSize.Lg}
            />
          }
          onClose={handleDismiss}
        >
          <Box
            twClassName="items-center"
            flexDirection={BoxFlexDirection.Column}
          >
            {/* Account Name */}
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
            >
              {accountGroupContext?.metadata?.name}
            </Text>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('rewards.link_account_group.linked_accounts')}
            </Text>
          </Box>
        </BottomSheetHeader>
      )}

      <Box twClassName="px-4 gap-2">
        {computedAddressData.length > 0 && (
          <FlatList
            testID="reward-opt-in-address-list"
            data={computedAddressData}
            keyExtractor={(item) => `${item.address}`}
            renderItem={renderAddressItem}
            showsVerticalScrollIndicator
            style={tw.style('max-h-80')}
          />
        )}
      </Box>

      {optedOutAddresses.length > 0 && (
        <Box twClassName="px-4 gap-2 pt-2">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isLoading={isLoading}
            onPress={handleLinkAccountGroup}
            twClassName="w-full"
          >
            {strings('rewards.link_account_group.link_account')}
          </Button>
        </Box>
      )}
    </BottomSheet>
  );
};

export default RewardOptInAccountGroupModal;
