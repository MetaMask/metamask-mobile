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
import Loader from '../../../../../../component-library/components-temp/Loader';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { selectInternalAccounts } from '../../../../../../selectors/accountsController';
import { useStyles } from '../../../../../hooks/useStyles';
import { useEIP7702Networks } from '../../../hooks/useEIP7702Networks';
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
      <View style={styles.wrapper} testID="network-data-loader">
        {pending ? (
          <Loader />
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
                <AccountNetworkRow network={networkConfiguration} />
              ))}
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
};

export default SwitchAccountTypeModal;
