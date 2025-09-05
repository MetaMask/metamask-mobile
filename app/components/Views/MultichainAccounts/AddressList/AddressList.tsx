import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import { useStyles } from '../../../hooks/useStyles';
import { selectInternalAccountListSpreadByScopesByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import HeaderBase from '../../../../component-library/components/HeaderBase';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor as MMDSIconColor,
} from '@metamask/design-system-react-native';
import MultichainAddressRow, {
  MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
} from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import { AddressListIds } from '../../../../../e2e/selectors/MultichainAccounts/AddressList.selectors';

import styleSheet from './styles';
import type { AddressListProps, AddressItem } from './types';
import ClipboardManager from '../../../../core/ClipboardManager';
import { strings } from '../../../../../locales/i18n';
import type { NavigatableRootParamList } from '../../../../util/navigation';
import type { StackNavigationProp } from '@react-navigation/stack';

/**
 * AddressList component displays a list of addresses spread by scopes.
 *
 * @returns {JSX.Element} The rendered component.
 */
export const AddressList = ({ route }: AddressListProps) => {
  const { groupId, title } = route.params;
  const navigation =
    useNavigation<
      StackNavigationProp<NavigatableRootParamList, 'MultichainAddressList'>
    >();
  const { styles } = useStyles(styleSheet, {});

  const selectInternalAccountsSpreadByScopes = useSelector(
    selectInternalAccountListSpreadByScopesByGroupId,
  );
  const internalAccountsSpreadByScopes =
    selectInternalAccountsSpreadByScopes(groupId);

  const renderAddressItem = useCallback(
    ({ item }: { item: AddressItem }) => {
      const copyAddressToClipboard = async () => {
        await ClipboardManager.setString(item.account.address);
      };

      return (
        <MultichainAddressRow
          chainId={item.scope}
          networkName={item.networkName}
          address={item.account.address}
          copyParams={{
            successMessage: strings('multichain_accounts.address_list.copied'),
            callback: copyAddressToClipboard,
          }}
          icons={[
            {
              name: IconName.QrCode,
              callback: () => {
                navigation.navigate('MultichainAccountDetailActions', {
                  screen: 'ShareAddressQR',
                  params: {
                    address: item.account.address,
                    networkName: item.networkName,
                    chainId: item.scope,
                    accountName: item.account.metadata.name,
                  },
                });
              },
              testId: `${MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID}-${item.scope}`,
            },
          ]}
        />
      );
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonIcon
            testID={AddressListIds.GO_BACK}
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            iconProps={{ color: MMDSIconColor.IconDefault }}
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
