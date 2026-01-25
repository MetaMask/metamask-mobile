import React, { useCallback, useLayoutEffect } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';

import { useStyles } from '../../../hooks/useStyles';
import { selectInternalAccountListSpreadByScopesByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import { IconName } from '@metamask/design-system-react-native';
import MultichainAddressRow, {
  MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
} from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import { AddressListIds } from '../../../../../e2e/selectors/MultichainAccounts/AddressList.selectors';
import {
  useParams,
  createNavigationDetails,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';

import styleSheet from './styles';
import type { AddressListProps, AddressItem } from './types';
import ClipboardManager from '../../../../core/ClipboardManager';
import { strings } from '../../../../../locales/i18n';
import getHeaderCenterNavbarOptions from '../../../../component-library/components-temp/HeaderCenter/getHeaderCenterNavbarOptions';

export const createAddressListNavigationDetails =
  createNavigationDetails<AddressListProps>(
    Routes.MULTICHAIN_ACCOUNTS.ADDRESS_LIST,
  );

/**
 * AddressList component displays a list of addresses spread by scopes.
 *
 * @returns {JSX.Element} The rendered component.
 */
export const AddressList = () => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const { groupId, title, onLoad } = useParams<AddressListProps>();

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
                navigation.navigate(
                  Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
                  {
                    screen:
                      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
                    params: {
                      address: item.account.address,
                      networkName: item.networkName,
                      chainId: item.scope,
                      groupId,
                    },
                  },
                );
              },
              testId: `${MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID}-${item.scope}`,
            },
          ]}
        />
      );
    },
    [navigation, groupId],
  );

  useLayoutEffect(() => {
    if (title) {
      navigation.setOptions({
        ...getHeaderCenterNavbarOptions({
          title,
          onBack: () => navigation.goBack(),
          backButtonProps: { testID: AddressListIds.GO_BACK },
          includesTopInset: true,
        }),
        headerShown: true,
      });
    }
  }, [navigation, title]);

  return (
    <View style={styles.safeArea}>
      <FlashList
        data={internalAccountsSpreadByScopes}
        keyExtractor={(item) => item.scope}
        renderItem={renderAddressItem}
        onLoad={onLoad}
      />
    </View>
  );
};
