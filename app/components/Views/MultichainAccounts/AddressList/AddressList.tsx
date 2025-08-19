import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import { useStyles } from '../../../hooks/useStyles';
import { selectInternalAccountListSpreadByScopesByGroupId } from '../../../../selectors/multichainAccounts/accounts';
import HeaderBase from '../../../../component-library/components/HeaderBase';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import MultichainAddressRow, {
  MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID,
  MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
} from '../../../../component-library/components-temp/MultichainAccounts/MultichainAddressRow';
import { AddressListIds } from '../../../../../e2e/selectors/MultichainAccounts/AddressList.selectors';

import styleSheet from './styles';
import type { Props as AddressListProps, AddressItem } from './types';
import ClipboardManager from '../../../../core/ClipboardManager';

/**
 * AddressList component displays a list of addresses spread by scopes.
 *
 * @param props - Component properties.
 * @returns {JSX.Element} The rendered component.
 */
export const AddressList = (props: AddressListProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const { groupId, title } = props.route.params;

  const selectInternalAccountsSpreadByScopes = useSelector(
    selectInternalAccountListSpreadByScopesByGroupId,
  );
  const internalAccountsSpreadByScopes =
    selectInternalAccountsSpreadByScopes(groupId);

  const copyAddressToClipboard = useCallback((address: string) => {
    ClipboardManager.setString(address);
  }, []);

  const renderAddressItem = useCallback(
    ({ item }: { item: AddressItem }) => (
      <MultichainAddressRow
        chainId={item.scope}
        networkName={item.networkName}
        address={item.account.address}
        icons={[
          {
            name: IconName.Copy,
            callback: () => copyAddressToClipboard(item.account.address),
            testId: MULTICHAIN_ADDRESS_ROW_COPY_BUTTON_TEST_ID,
          },
          {
            name: IconName.QrCode,
            callback: () => {
              // TODO: Implement navigation to QR code screen when it is ready
            },
            testId: MULTICHAIN_ADDRESS_ROW_QR_BUTTON_TEST_ID,
          },
        ]}
      />
    ),
    [copyAddressToClipboard],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBase
        style={styles.header}
        startAccessory={
          <ButtonLink
            testID={AddressListIds.GO_BACK}
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
