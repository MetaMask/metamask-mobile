import React, { useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAccounts } from '../../../../hooks/useAccounts';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { setDestAddress } from '../../../../../core/redux/slices/bridge';
import { Box } from '../../../Box/Box';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import CaipAccountSelectorList from '../../../CaipAccountSelectorList';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { selectValidDestInternalAccountIds } from '../../../../../selectors/bridge';
import { selectAccountGroups } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectMultichainAccountsState2Enabled } from '../../../../../selectors/featureFlagController/multichainAccounts';
import { useNavigation } from '@react-navigation/native';

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
  const { accounts, ensByAccountAddress } = useAccounts();
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();

  // Filter accounts using BIP-44 aware multichain selectors via account IDs
  const validDestIds = useSelector(selectValidDestInternalAccountIds);
  const accountGroups = useSelector(selectAccountGroups);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const filteredAccounts = useMemo(() => {
    if (!validDestIds || validDestIds.size === 0) return [];
    return accounts
      .filter((account) => validDestIds.has(account.id))
      .map((account) => {
        // Use account group name if available, otherwise use account name
        let accountName = account.name;
        if (isMultichainAccountsState2Enabled) {
          const accountGroup = accountGroups.find((group) =>
            group.accounts.includes(account.id),
          );
          accountName = accountGroup?.metadata.name || account.name;
        }
        return {
          ...account,
          name: accountName,
        };
      });
  }, [
    accounts,
    validDestIds,
    accountGroups,
    isMultichainAccountsState2Enabled,
  ]);

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

  return (
    <Box style={styles.container}>
      <Box>
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
