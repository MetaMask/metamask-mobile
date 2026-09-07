import React, { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  BottomSheet,
  BottomSheetHeader,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import Spinner from '../../../../../UI/AnimatedSpinner';
import { useStyles } from '../../../../../hooks/useStyles';
import { useEIP7702Networks } from '../../../hooks/7702/useEIP7702Networks';
import AccountNetworkRow from './account-network-row';
import styleSheet from './switch-account-type-modal.styles';
import Engine from '../../../../../../core/Engine';

interface SwitchAccountTypeModalRouteParams {
  address?: Hex;
}

interface SwitchAccountTypeModalParamList {
  ConfirmationSwitchAccountType: SwitchAccountTypeModalRouteParams;
  [key: string]: object | undefined;
}

const SwitchAccountTypeModal = () => {
  const route =
    useRoute<
      RouteProp<
        SwitchAccountTypeModalParamList,
        'ConfirmationSwitchAccountType'
      >
    >();
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation<AppNavigationProp>();
  const selectedAccountAddress =
    Engine.context.AccountsController.getSelectedAccount()?.address;
  const address: Hex | undefined =
    route?.params?.address ?? (selectedAccountAddress as Hex | undefined);
  const { network7702List, pending } = useEIP7702Networks(address ?? '');
  const internalAccounts = useSelector(selectInternalAccounts);
  const account = internalAccounts.find(
    ({ address: accAddress }) => accAddress === address,
  );

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Handle case when no address is available
  if (!address) {
    return (
      <BottomSheet goBack={goBack}>
        <BottomSheetHeader
          onBack={goBack}
          backButtonProps={{ testID: 'switch-account-goback' }}
        />
        <View style={styles.wrapper}>
          <View style={styles.spinner} testID="no-address-fallback">
            <Text variant={TextVariant.BodyMd}>No account selected</Text>
          </View>
        </View>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet goBack={goBack}>
      <BottomSheetHeader
        onBack={goBack}
        backButtonProps={{ testID: 'switch-account-goback' }}
      />
      <View style={styles.wrapper}>
        {pending ? (
          <View style={styles.spinner} testID="network-data-loader">
            <Spinner />
          </View>
        ) : (
          <>
            <View style={styles.account_info}>
              <Avatar
                variant={AvatarVariant.Account}
                size={AvatarSize.Md}
                accountAddress={address}
              />
              <Text style={styles.account_name} variant={TextVariant.HeadingMd}>
                {account?.metadata.name}
              </Text>
            </View>
            <View>
              {network7702List?.map((networkConfiguration) => (
                <AccountNetworkRow
                  key={networkConfiguration.chainId}
                  network={networkConfiguration}
                  address={address}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
};

export default SwitchAccountTypeModal;
