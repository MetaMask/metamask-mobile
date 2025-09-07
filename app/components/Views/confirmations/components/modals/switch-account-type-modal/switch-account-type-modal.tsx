import React, { useCallback } from 'react';
import { Hex } from '@metamask/utils';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import BottomSheet from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import Spinner from '../../../../../UI/AnimatedSpinner';
import { useStyles } from '../../../../../hooks/useStyles';
import { useEIP7702Networks } from '../../../hooks/7702/useEIP7702Networks';
import AccountNetworkRow from './account-network-row';
import styleSheet from './switch-account-type-modal.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Engine from '../../../../../../core/Engine';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../../util/navigation/types';

type SwitchAccountTypeModalProps = StackScreenProps<
  RootParamList,
  'ConfirmationSwitchAccountType'
>;

const SwitchAccountTypeModal = ({ route }: SwitchAccountTypeModalProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const address =
    (route?.params as { address: Hex })?.address ??
    Engine.context.AccountsController.getSelectedAccount()?.address;
  const { network7702List, pending } = useEIP7702Networks(address);
  const internalAccounts = useSelector(selectInternalAccounts);
  const account = internalAccounts.find(
    ({ address: accAddress }) => accAddress === address,
  );

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <BottomSheet>
      <TouchableOpacity onPress={goBack} testID="switch-account-goback">
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Sm}
          color={IconColor.Default}
          style={styles.backIcon}
        />
      </TouchableOpacity>
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
              <Text style={styles.account_name} variant={TextVariant.HeadingMD}>
                {account?.metadata.name}
              </Text>
            </View>
            <View>
              {network7702List?.map((networkConfiguration) => (
                <AccountNetworkRow
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
