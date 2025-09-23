import React, { useCallback, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { setDestAddress } from '../../../../../core/redux/slices/bridge';
import { Box } from '../../../Box/Box';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import CaipAccountSelectorList from '../../../CaipAccountSelectorList';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { useDestinationAccounts } from '../../hooks/useDestinationAccounts';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    container: {
      alignSelf: 'center',
      paddingHorizontal: 24,
    },
    cellContainer: {
      borderColor: colors.border.muted,
      borderWidth: 1,
      borderRadius: 8,
      overflow: 'hidden',
    },
    closeButtonContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    avatarStyle: {
      alignSelf: 'center',
      marginRight: 10,
    },
  });

const DestinationAccountSelector = () => {
  const dispatch = useDispatch();
  const { destinationAccounts, ensByAccountAddress } = useDestinationAccounts();
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');

  const privacyMode = useSelector(selectPrivacyMode);

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

  const filteredAccounts = useMemo(() => destinationAccounts.filter(
      (account) =>
        account.address.toLowerCase().includes(searchText.toLowerCase()) ||
        account.name.toLowerCase().includes(searchText.toLowerCase()),
    ), [destinationAccounts, searchText]);

  return (
    <Box style={styles.container}>
      6v
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
          selectedAddresses={[]}
          privacyMode={privacyMode}
          isSelectWithoutMenu
        />
      </Box>
    </Box>
  );
};

export default DestinationAccountSelector;
