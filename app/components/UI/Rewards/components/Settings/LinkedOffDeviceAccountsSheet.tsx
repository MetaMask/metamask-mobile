import React, { useCallback } from 'react';
import { FlatList } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  ButtonIcon,
  IconName,
  IconSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../../../locales/i18n';
import { formatAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import ClipboardManager from '../../../../../core/ClipboardManager';
import type { OffDeviceAccount } from '../../hooks/useLinkedOffDeviceAccounts';

interface LinkedOffDeviceAccountsSheetProps {
  accounts: OffDeviceAccount[];
  onClose?: () => void;
}

const LinkedOffDeviceAccountsSheet: React.FC<
  LinkedOffDeviceAccountsSheetProps
> = ({ accounts, onClose }) => {
  const handleCopy = useCallback(async (address: string) => {
    try {
      await ClipboardManager.setString(address);
    } catch {
      // clipboard write failures are non-critical; swallow silently
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: OffDeviceAccount }) => {
      let networkImageSource;
      try {
        networkImageSource = getNetworkImageSource({
          chainId: item.caipChainId,
        });
      } catch {
        networkImageSource = undefined;
      }

      return (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="py-3 gap-3"
        >
          {/* Network icon */}
          <Avatar
            variant={AvatarVariant.Network}
            size={AvatarSize.Md}
            name={item.caipChainId}
            imageSource={networkImageSource}
          />

          {/* Shortened address - flex grows to fill remaining space */}
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {formatAddress(item.address, 'short')}
            </Text>
          </Box>

          {/* Copy CTA */}
          <ButtonIcon
            onPress={() => handleCopy(item.address)}
            iconName={IconName.Copy}
            iconProps={{ size: IconSize.Md }}
          />
        </Box>
      );
    },
    [handleCopy],
  );

  return (
    <BottomSheet shouldNavigateBack={false} onClose={onClose}>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {strings('rewards.settings.off_device_accounts_sheet_title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-6">
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.caip10}
          renderItem={renderItem}
          scrollEnabled={accounts.length > 8}
        />
      </Box>
    </BottomSheet>
  );
};

export default LinkedOffDeviceAccountsSheet;
