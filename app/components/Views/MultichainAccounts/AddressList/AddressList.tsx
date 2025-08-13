import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { AccountGroupId } from '@metamask/account-api';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { type CaipChainId } from '@metamask/utils';
import { type InternalAccount } from '@metamask/keyring-internal-api';

import { useStyles } from '../../../hooks/useStyles';
import { selectInternalAccountListSpreadByScopesByGroupId } from '../../../../selectors/multichainAccounts/accounts';

import HeaderBase from '../../../../component-library/components/HeaderBase';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import MultichainAddressRow from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';

import styleSheet from './styles';

interface AddressListProps {
  route: {
    params: {
      groupId: AccountGroupId;
      title: string;
    };
  };
}

export const AddressList = (props: AddressListProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const { groupId, title } = props.route.params;

  const selectInternalAccountsSpreadByScopes = useSelector(
    selectInternalAccountListSpreadByScopesByGroupId,
  );
  const internalAccountsSpreadByScopes =
    selectInternalAccountsSpreadByScopes(groupId);

  const renderAddressItem = useCallback(
    ({
      item,
    }: {
      item: {
        scope: CaipChainId;
        networkName: string;
        account: InternalAccount;
      };
    }) => (
      <MultichainAddressRow
        chainId={item.scope}
        networkName={item.networkName}
        address={item.account.address}
      />
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonLink
            // testID={}
            labelTextVariant={TextVariant.BodyMDMedium}
            label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
            onPress={() => navigation.goBack()}
          />
        }
      >
        {title}
      </HeaderBase>
      <View style={styles.container}>
        <FlashList
          data={internalAccountsSpreadByScopes}
          keyExtractor={(item) => item.scope}
          renderItem={renderAddressItem}
        />
      </View>
    </SafeAreaView>
  );
};
