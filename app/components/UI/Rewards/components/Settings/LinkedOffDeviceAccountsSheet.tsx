import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FlatList } from 'react-native-gesture-handler';
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
import { toHex } from '@metamask/controller-utils';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { strings } from '../../../../../../locales/i18n';
import { formatAddress } from '../../../../../util/address';
import {
  getNetworkImageSource,
  getDefaultNetworkByChainId,
} from '../../../../../util/networks';
import ClipboardManager from '../../../../../core/ClipboardManager';
import type { OffDeviceAccount } from '../../hooks/useLinkedOffDeviceAccounts';

const styles = StyleSheet.create({
  list: {
    maxHeight: 275,
  },
});

/**
 * Returns the short display name for a CAIP chain ID (e.g. "eip155:1" → "Ethereum").
 * Falls back to the raw caipChainId string when the chain is not in the default network list.
 */
function getChainShortName(caipChainId: string): string {
  try {
    const colonIdx = caipChainId.indexOf(':');
    if (colonIdx === -1) return caipChainId;
    const reference = caipChainId.slice(colonIdx + 1);
    const hexChainId = toHex(reference);
    const network = getDefaultNetworkByChainId(hexChainId);
    return (
      (network as unknown as { shortName?: string })?.shortName ?? caipChainId
    );
  } catch {
    return caipChainId;
  }
}

interface LinkedOffDeviceAccountsSheetProps {
  accounts: OffDeviceAccount[];
  onClose?: () => void;
}

const LinkedOffDeviceAccountsSheet: React.FC<
  LinkedOffDeviceAccountsSheetProps
> = ({ accounts, onClose }) => {
  const navigation = useNavigation();

  const handleContactSupport = useCallback(() => {
    let supportUrl = 'https://support.metamask.io';

    ///: BEGIN:ONLY_INCLUDE_IF(beta)
    supportUrl = 'https://intercom.help/internal-beta-testing/en/';
    ///: END:ONLY_INCLUDE_IF

    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: supportUrl,
        title: strings('app_settings.contact_support'),
      },
    });
  }, [navigation]);

  const handleCopy = useCallback(async (address: string) => {
    try {
      await ClipboardManager.setString(address);
    } catch {
      // clipboard write failures are non-critical; swallow silently
    }
  }, []);

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => a.address.localeCompare(b.address)),
    [accounts],
  );

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

      const chainName = getChainShortName(item.caipChainId);

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

          {/* Chain name + shortened address */}
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {chainName}
            </Text>
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

      <Box twClassName="px-4 gap-4">
        <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
          {strings('rewards.settings.off_device_accounts_sheet_description')}{' '}
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-primary-default"
            onPress={handleContactSupport}
          >
            {strings('rewards.settings.off_device_accounts_sheet_let_us_know')}
          </Text>
        </Text>

        <FlatList
          data={sortedAccounts}
          keyExtractor={(item) => item.caip10}
          renderItem={renderItem}
          style={styles.list}
          scrollEnabled
        />
      </Box>
    </BottomSheet>
  );
};

export default LinkedOffDeviceAccountsSheet;
