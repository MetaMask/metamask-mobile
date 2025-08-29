import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAccounts } from '../../../../hooks/useAccounts';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import {
  selectDestAddress,
  setDestAddress,
  selectIsEvmToSolana,
  selectIsSolanaToEvm,
} from '../../../../../core/redux/slices/bridge';
import { Box } from '../../../Box/Box';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import {
  AvatarAccountType,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { RootState } from '../../../../../reducers';
import { formatAddress } from '../../../../../util/address';
import { View, StyleSheet } from 'react-native';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { Theme } from '../../../../../util/theme/models';
import { strings } from '../../../../../../locales/i18n';
import CaipAccountSelectorList from '../../../CaipAccountSelectorList';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { selectValidDestInternalAccountIds } from '../../../../../selectors/bridge';

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
  const hasInitialized = useRef(false);

  // Filter accounts using BIP-44 aware multichain selectors via account IDs
  const validDestIds = useSelector(selectValidDestInternalAccountIds);
  const filteredAccounts = useMemo(() => {
    if (!validDestIds || validDestIds.size === 0) return [];
    return accounts.filter((account) => validDestIds.has(account.id));
  }, [accounts, validDestIds]);

  const privacyMode = useSelector(selectPrivacyMode);
  const destAddress = useSelector(selectDestAddress);
  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const isEvmToSolana = useSelector(selectIsEvmToSolana);
  const isSolanaToEvm = useSelector(selectIsSolanaToEvm);

  const handleSelectAccount = useCallback(
    (caipAccountId: CaipAccountId | undefined) => {
      const address = caipAccountId
        ? parseCaipAccountId(caipAccountId).address
        : undefined;
      dispatch(setDestAddress(address));
    },
    [dispatch],
  );

  const handleClearDestAddress = useCallback(() => {
    handleSelectAccount(undefined);
  }, [handleSelectAccount]);

  useEffect(() => {
    if (filteredAccounts.length === 0) {
      return;
    }

    // Allow undefined so user can pick an account
    const doesDestAddrMatchNetworkType =
      !destAddress ||
      (isSolanaToEvm && !isSolanaAddress(destAddress)) ||
      (isEvmToSolana && isSolanaAddress(destAddress));

    if (
      (!hasInitialized.current && !destAddress) ||
      !doesDestAddrMatchNetworkType
    ) {
      handleSelectAccount(filteredAccounts[0].caipAccountId);
      hasInitialized.current = true;
    }
  }, [
    filteredAccounts,
    destAddress,
    handleSelectAccount,
    isEvmToSolana,
    isSolanaToEvm,
  ]);

  return (
    <Box style={styles.container}>
      {destAddress ? (
        <View style={styles.cellContainer}>
          <Cell
            key={destAddress}
            variant={CellVariant.Select}
            title={strings('bridge.receive_at')}
            secondaryText={formatAddress(destAddress, 'short')}
            showSecondaryTextIcon={false}
            avatarProps={{
              variant: AvatarVariant.Account,
              type: accountAvatarType,
              accountAddress: destAddress,
              style: styles.avatarStyle,
            }}
            onPress={handleClearDestAddress}
          >
            <View style={styles.closeButtonContainer}>
              <ButtonIcon
                onPress={handleClearDestAddress}
                iconName={IconName.Close}
              />
            </View>
          </Cell>
        </View>
      ) : (
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
      )}
    </Box>
  );
};

export default DestinationAccountSelector;
