import React, { useCallback, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  selectDestAddress,
  setDestAddress,
} from '../../../../../core/redux/slices/bridge';
import { Box } from '../../../Box/Box';
import { StyleSheet } from 'react-native';
import CaipAccountSelectorList from '../../../CaipAccountSelectorList';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { useDestinationAccounts } from '../../hooks/useDestinationAccounts';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import { areAddressesEqual } from '../../../../../util/address';

const createStyles = () =>
  StyleSheet.create({
    container: {
      alignSelf: 'center',
      paddingHorizontal: 24,
    },
  });

const DestinationAccountSelector = () => {
  const dispatch = useDispatch();
  const { destinationAccounts, ensByAccountAddress } = useDestinationAccounts();
  const styles = createStyles();
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');

  const privacyMode = useSelector(selectPrivacyMode);

  const destAddress = useSelector(selectDestAddress);
  const selectedAccount = destinationAccounts.find(
    (account) => destAddress && areAddressesEqual(account.address, destAddress),
  );
  const caipDestAddress = selectedAccount
    ? selectedAccount.caipAccountId
    : undefined;

  const handleSelectAccount = useCallback(
    (caipAccountId: CaipAccountId | undefined) => {
      const address = caipAccountId
        ? parseCaipAccountId(caipAccountId).address
        : undefined;
      dispatch(setDestAddress(address));
      navigation.goBack();
    },
    [dispatch, navigation],
  );

  const filteredAccounts = useMemo(
    () =>
      destinationAccounts.filter(
        (account) =>
          account.address.toLowerCase().includes(searchText.toLowerCase()) ||
          account.name.toLowerCase().includes(searchText.toLowerCase()),
      ),
    [destinationAccounts, searchText],
  );

  return (
    <Box style={styles.container}>
      <Box>
        <TextFieldSearch
          placeholder="Search or paste address"
          value={searchText}
          onChangeText={(value) => setSearchText(value)}
        />
        <CaipAccountSelectorList
          accounts={filteredAccounts}
          onSelectAccount={handleSelectAccount}
          ensByAccountAddress={ensByAccountAddress}
          selectedAddresses={caipDestAddress ? [caipDestAddress] : []}
          privacyMode={privacyMode}
          isSelectWithoutMenu
        />
      </Box>
    </Box>
  );
};

export default DestinationAccountSelector;
