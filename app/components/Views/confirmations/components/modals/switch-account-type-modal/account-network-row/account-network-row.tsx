import { Hex } from '@metamask/utils';
import { NetworkConfiguration } from '@metamask/network-controller';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Switch, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { SmartAccountIds } from '../../../../../MultichainAccounts/SmartAccount.testIds';
import { SwitchAccountModalSelectorIDs } from '../SwitchAccountModal.testIds';
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
import { EIP7702NetworkConfiguration } from '../../../../hooks/7702/useEIP7702Networks';
import { useBatchAuthorizationRequests } from '../../../../hooks/7702/useBatchAuthorizationRequests';
import { useEIP7702Accounts } from '../../../../hooks/7702/useEIP7702Accounts';
import styleSheet from './account-network-row.styles';
import { useSelector } from 'react-redux';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../../UI/Box/box.types';
import { Box } from '../../../../../../UI/Box/Box';
import { useTheme } from '../../../../../../../util/theme';
import { selectMultichainAccountsState1Enabled } from '../../../../../../../selectors/featureFlagController/multichainAccounts';

const AccountNetworkRow = ({
  address,
  network,
}: {
  address: Hex;
  network: EIP7702NetworkConfiguration;
}) => {
  const useMultichainAccountsDesign = useSelector(
    selectMultichainAccountsState1Enabled,
  );
  const navigation = useNavigation();
  const { downgradeAccount, upgradeAccount } = useEIP7702Accounts(
    network as unknown as NetworkConfiguration,
  );
  const theme = useTheme();
  const { colors } = theme;
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
    if (switchRequestSubmitted) return;
    setSwitchRequestSubmitted(true);
    if (addressSupportSmartAccount) {
      await downgradeAccount(address);
    } else if (upgradeContractAddress) {
      await upgradeAccount(address, upgradeContractAddress);
    }
    if (!useMultichainAccountsDesign) {
      // This navigation below is to close account modal.
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
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
    useMultichainAccountsDesign,
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

  if (useMultichainAccountsDesign) {
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
  }

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
          <Text
            variant={TextVariant.BodyMDBold}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.network_name}
          >
            {name}
          </Text>
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
            label={
              addressSupportSmartAccount
                ? strings('confirm.7702_functionality.switchBack')
                : strings('confirm.7702_functionality.switch')
            }
            onPress={onSwitch}
            testID={`${SwitchAccountModalSelectorIDs.SWITCH_ACCOUNT_BUTTON}-${name}`}
          />
        )}
      </View>
    </View>
  );
};

export default AccountNetworkRow;
