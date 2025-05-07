import { Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import Spinner, { SpinnerSize } from '../../../../../../UI/AnimatedSpinner';
import { useStyles } from '../../../../../../hooks/useStyles';
import { EIP7702NetworkConfiguration } from '../../../../hooks/useEIP7702Networks';
import { useBatchAuthorizationRequests } from '../../../../hooks/useBatchAuthorizationRequests';
import { useEIP7702Accounts } from '../../../../hooks/useEIP7702Accounts';
import styleSheet from './account-network-row.styles';

const AccountNetworkRow = ({
  address,
  network,
}: {
  address: Hex;
  network: EIP7702NetworkConfiguration;
}) => {
  const navigation = useNavigation();
  const { downgradeAccount, upgradeAccount } = useEIP7702Accounts(
    network as unknown as NetworkConfiguration,
  );
  const { styles } = useStyles(styleSheet, {});

  const { name, chainId, isSupported, upgradeContractAddress } = network;
  const networkImage = getNetworkImageSource({ networkType: 'evm', chainId });
  const [addressSupportSmartAccount, setAddressSupportSmartAccount] =
    useState(isSupported);
  const [switchRequestSubmitted, setSwitchRequestSubmitted] = useState(false);
  const prevHasPendingRequests = useRef<boolean>();
  const { hasPendingRequests } = useBatchAuthorizationRequests(
    address,
    chainId as Hex,
  );

  const onSwitch = useCallback(async () => {
    setSwitchRequestSubmitted(true);
    if (addressSupportSmartAccount) {
      await downgradeAccount(address);
    } else if (upgradeContractAddress) {
      await upgradeAccount(address, upgradeContractAddress);
    }
    // This navigation below is to close account modal.
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
    // This navigation to confirmation modal
    // is needed as above navigation lands on home page
    navigation.navigate(Routes.CONFIRMATION_REQUEST_MODAL);
    setSwitchRequestSubmitted(false);
  }, [
    address,
    downgradeAccount,
    addressSupportSmartAccount,
    navigation,
    upgradeAccount,
    upgradeContractAddress,
  ]);

  useEffect(() => {
    if (prevHasPendingRequests.current) {
      if (prevHasPendingRequests.current !== hasPendingRequests) {
        setAddressSupportSmartAccount(!addressSupportSmartAccount);
      }
    }
    prevHasPendingRequests.current = hasPendingRequests;
  }, [addressSupportSmartAccount, hasPendingRequests, prevHasPendingRequests]);

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
            {addressSupportSmartAccount
              ? strings('confirm.7702_functionality.smartAccountLabel')
              : strings('confirm.7702_functionality.standardAccountLabel')}
          </Text>
        </View>
      </View>
      <View style={styles.button_section}>
        {hasPendingRequests || switchRequestSubmitted ? (
          <Spinner size={SpinnerSize.SM} />
        ) : (
          <Button
            variant={ButtonVariants.Link}
            label={strings('confirm.7702_functionality.switch')}
            onPress={onSwitch}
          />
        )}
      </View>
    </View>
  );
};

export default AccountNetworkRow;
