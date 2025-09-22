import React, { useCallback } from 'react';
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
          accounts={destinationAccounts}
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
