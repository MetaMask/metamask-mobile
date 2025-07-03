import React from 'react';
import { Hex } from '@metamask/utils';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useRoute } from '@react-navigation/native';

import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import BottomSheet from '../../../../../../component-library/components/BottomSheets/BottomSheet';
<<<<<<< HEAD
=======
import Loader from '../../../../../../component-library/components-temp/Loader';
>>>>>>> stable
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
<<<<<<< HEAD
import Spinner from '../../../../../UI/AnimatedSpinner';
import { useStyles } from '../../../../../hooks/useStyles';
import { useEIP7702Networks } from '../../../hooks/7702/useEIP7702Networks';
=======
import { useStyles } from '../../../../../hooks/useStyles';
import { useEIP7702Networks } from '../../../hooks/useEIP7702Networks';
>>>>>>> stable
import AccountNetworkRow from './account-network-row';
import styleSheet from './switch-account-type-modal.styles';

const SwitchAccountTypeModal = () => {
  const { styles } = useStyles(styleSheet, {});
  const route = useRoute();
  const address = (route?.params as { address: Hex })?.address;
  const { network7702List, pending } = useEIP7702Networks(address);
  const internalAccounts = useSelector(selectInternalAccounts);
  const account = internalAccounts.find(
    ({ address: accAddress }) => accAddress === address,
  );

  return (
    <BottomSheet>
<<<<<<< HEAD
      <View style={styles.wrapper}>
        {pending ? (
          <View style={styles.spinner} testID="network-data-loader">
            <Spinner />
          </View>
=======
      <View style={styles.wrapper} testID="network-data-loader">
        {pending ? (
          <Loader />
>>>>>>> stable
        ) : (
          <>
            <View style={styles.account_info}>
              <Avatar
                variant={AvatarVariant.Account}
                size={AvatarSize.Lg}
                accountAddress={address}
              />
              <Text style={styles.account_name} variant={TextVariant.HeadingMD}>
                {account?.metadata.name}
              </Text>
            </View>
            <View>
              {network7702List?.map((networkConfiguration) => (
<<<<<<< HEAD
                <AccountNetworkRow
                  network={networkConfiguration}
                  address={address}
                />
=======
                <AccountNetworkRow network={networkConfiguration} />
>>>>>>> stable
              ))}
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
};

export default SwitchAccountTypeModal;
