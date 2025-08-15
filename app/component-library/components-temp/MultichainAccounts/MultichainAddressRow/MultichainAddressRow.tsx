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
import { IconColor } from '../../../components/Icons/Icon';
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
} from './MultichainAddressRow.constants';
import useCopyClipboard from '../../../../components/Views/Notifications/Details/hooks/useCopyClipboard';

const MultichainAddressRow = ({
  chainId,
  networkName,
  address,
  icons,
  style,
  testID = MULTICHAIN_ADDRESS_ROW_TEST_ID,
  ...props
}: MultichainAddressRowProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const copyToClipboard = useCopyClipboard();

  const networkImageSource = getNetworkImageSource({ chainId });
  const truncatedAddress = formatAddress(address, 'short');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCopyClick = useCallback(() => {
    copyToClipboard(address);
  }, [copyToClipboard, address]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        {icons.map((icon, index) => (
          <ButtonIcon
            key={index}
            iconName={icon.name}
            size={ButtonIconSizes.Md}
            onPress={icon.callback}
            iconColor={IconColor.Default}
            testID={icon.testId}
          />
        ))}
      </View>
    </View>
  );
};

export default MultichainAddressRow;
