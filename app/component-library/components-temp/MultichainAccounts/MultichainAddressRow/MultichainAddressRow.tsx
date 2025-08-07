import React, { useCallback } from 'react';
import { View } from 'react-native';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../components/Avatars/Avatar';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../components/Buttons/ButtonIcon';
import Text, { TextVariant, TextColor } from '../../../components/Texts/Text';
import { IconName, IconColor } from '../../../components/Icons/Icon';
import { useStyles } from '../../../hooks';
import { formatAddress } from '../../../../util/address';
import { getNetworkImageSource } from '../../../../util/networks';

import styleSheet from './MultichainAddressRow.styles';
import { MultichainAddressRowProps } from './MultichainAddressRow.types';
import {
  MULTICHAIN_ADDRESS_ROW_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
} from './MultichainAddressRow.constants';
import useCopyClipboard from '../../../../components/Views/Notifications/Details/hooks/useCopyClipboard';

const MultichainAddressRow = ({
  chainId,
  networkName,
  address,
  style,
  testID = MULTICHAIN_ADDRESS_ROW_TEST_ID,
  ...props
}: MultichainAddressRowProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const copyToClipboard = useCopyClipboard();

  const networkImageSource = getNetworkImageSource({ chainId });
  const truncatedAddress = formatAddress(address, 'short');

  const handleCopyClick = useCallback(() => {
    copyToClipboard(address);
  }, [copyToClipboard, address]);

  const handleQrClick = useCallback(() => {
    // TODO: Implement QR code functionality
    // QR code clicked for address: address
  }, []);

  return (
    <View style={styles.base} testID={testID} {...props}>
      <Avatar
        variant={AvatarVariant.Network}
        size={AvatarSize.Md}
        name={networkName}
        imageSource={networkImageSource}
        testID={MULTICHAIN_ADDRESS_ROW_NETWORK_ICON_TEST_ID}
      />

      <View style={styles.content}>
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Default}
          testID={MULTICHAIN_ADDRESS_ROW_NETWORK_NAME_TEST_ID}
        >
          {networkName}
        </Text>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          testID={MULTICHAIN_ADDRESS_ROW_ADDRESS_TEST_ID}
        >
          {truncatedAddress}
        </Text>
      </View>

      <View style={styles.actions}>
        <ButtonIcon
          iconName={IconName.Copy}
          size={ButtonIconSizes.Md}
          onPress={handleCopyClick}
          iconColor={IconColor.Default}
          testID={MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID}
        />

        <ButtonIcon
          iconName={IconName.QrCode}
          size={ButtonIconSizes.Md}
          onPress={handleQrClick}
          iconColor={IconColor.Default}
          testID={MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID}
        />
      </View>
    </View>
  );
};

export default MultichainAddressRow;
