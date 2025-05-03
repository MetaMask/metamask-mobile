import { Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonVariants,
} from '../../../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../../../constants/navigation/Routes';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { getNetworkImageSource } from '../../../../../../../util/networks';
import { useStyles } from '../../../../../../hooks/useStyles';
import { EIP7702NetworkConfiguration } from '../../../../hooks/useEIP7702Networks';
import { useEIP7702Account } from '../../../../hooks/useEIP7702Accounts';
import styleSheet from './account-network-row.styles';

const AccountNetworkRow = ({
  address,
  network,
}: {
  address: Hex;
  network: EIP7702NetworkConfiguration;
}) => {
  const navigation = useNavigation();
  const { downgradeAccount, upgradeAccount } = useEIP7702Account(
    network as unknown as NetworkConfiguration,
  );
  const { styles } = useStyles(styleSheet, {});

  const { name, chainId, isSupported, upgradeContractAddress } = network;
  const networkImage = getNetworkImageSource({ networkType: 'evm', chainId });

  const onSwitch = useCallback(async () => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
    if (isSupported) {
      await downgradeAccount(address);
    } else if (upgradeContractAddress) {
      await upgradeAccount(address, upgradeContractAddress);
    }
  }, [
    address,
    downgradeAccount,
    isSupported,
    upgradeAccount,
    upgradeContractAddress,
  ]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.left_section}>
        <Avatar
          variant={AvatarVariant.Network}
          size={AvatarSize.Lg}
          name={name}
          imageSource={networkImage}
        />
        <View style={styles.name_section}>
          <Text variant={TextVariant.BodyMDBold}>{name}</Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {isSupported
              ? strings('confirm.7702_functionality.smartAccountLabel')
              : strings('confirm.7702_functionality.standardAccountLabel')}
          </Text>
        </View>
      </View>
      <Button
        variant={ButtonVariants.Link}
        label={strings('confirm.7702_functionality.switch')}
        onPress={onSwitch}
      />
    </View>
  );
};

export default AccountNetworkRow;
