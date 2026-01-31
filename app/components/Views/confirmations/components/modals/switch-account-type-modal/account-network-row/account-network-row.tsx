import { Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { SmartAccountIds } from '../../../../../MultichainAccounts/SmartAccount.testIds';
import Routes from '../../../../../../../constants/navigation/Routes';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../hooks/useStyles';
import { EIP7702NetworkConfiguration } from '../../../../hooks/7702/useEIP7702Networks';
import { useBatchAuthorizationRequests } from '../../../../hooks/7702/useBatchAuthorizationRequests';
import { useEIP7702Accounts } from '../../../../hooks/7702/useEIP7702Accounts';
import styleSheet from './account-network-row.styles';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../../UI/Box/box.types';
import { Box } from '../../../../../../UI/Box/Box';
import { useTheme } from '../../../../../../../util/theme';

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
  const theme = useTheme();
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, {});

  const { chainId, isSupported, upgradeContractAddress } = network;
  const [addressSupportSmartAccount, setAddressSupportSmartAccount] =
    useState(isSupported);
  const [switchRequestSubmitted, setSwitchRequestSubmitted] = useState(false);
  const prevHasPendingRequests = useRef<boolean>();
  const { hasPendingRequests } = useBatchAuthorizationRequests(
    address,
    chainId as Hex,
  );

  const onSwitch = useCallback(async () => {
    if (switchRequestSubmitted) return;
    setSwitchRequestSubmitted(true);
    if (addressSupportSmartAccount) {
      await downgradeAccount(address);
    } else if (upgradeContractAddress) {
      await upgradeAccount(address, upgradeContractAddress);
    }

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
    switchRequestSubmitted,
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
    <Box
      flexDirection={FlexDirection.Row}
      justifyContent={JustifyContent.spaceBetween}
      alignItems={AlignItems.center}
      style={styles.multichain_accounts_row_wrapper}
    >
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
        {network.name}
      </Text>
      <Switch
        testID={SmartAccountIds.SMART_ACCOUNT_SWITCH}
        value={addressSupportSmartAccount}
        onValueChange={onSwitch}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={theme.brandColors.white}
        ios_backgroundColor={colors.border.muted}
        disabled={
          hasPendingRequests ||
          (!addressSupportSmartAccount && !upgradeContractAddress)
        }
      />
    </Box>
  );
};

export default AccountNetworkRow;
