import { useSelector } from "react-redux";
import { useAccounts } from "../../../../hooks/useAccounts";
import AccountSelectorList from "../../../AccountSelectorList";
import { selectPrivacyMode } from "../../../../../selectors/preferencesController";
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { useDispatch } from "react-redux";
import { selectDestAddress, setDestAddress } from "../../../../../core/redux/slices/bridge";
import { Box } from "../../../Box/Box";
import Cell, { CellVariant } from "../../../../../component-library/components/Cells/Cell";
import { AvatarAccountType, AvatarVariant } from "../../../../../component-library/components/Avatars/Avatar";
import { RootState } from "../../../../../reducers";
import { formatAddress } from "../../../../../util/address";
import { View, StyleSheet } from "react-native";
import ButtonIcon from "../../../../../component-library/components/Buttons/ButtonIcon";
import { IconName } from "../../../../../component-library/components/Icons/Icon";
import { useEffect, useMemo, useCallback } from "react";
import { useTheme } from "../../../../../util/theme";
import { Theme } from "../../../../../util/theme/models";

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
      overflow: 'hidden'
    },
    closeButtonContainer: {
      flex: 1,
      justifyContent: 'center'
    }
  });

const DestinationAccountSelector = () => {
  const dispatch = useDispatch();
  const { accounts, ensByAccountAddress } = useAccounts();
  const theme = useTheme();
  const styles = createStyles(theme);

  const privacyMode = useSelector(selectPrivacyMode);
  const destAddress = useSelector(selectDestAddress);
  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const filteredAccounts = useMemo(() => 
    accounts.filter((account) => isSolanaAddress(account.address)),
    [accounts]
  );

  const handleSelectAccount = useCallback((address: string | undefined) => {
    if (address === undefined || isSolanaAddress(address)) {
      dispatch(setDestAddress(address));
    }
  }, [dispatch]);

  useEffect(() => {
    if (filteredAccounts.length > 0 && !destAddress) {
      handleSelectAccount(filteredAccounts[0].address);
    }
  }, [filteredAccounts, handleSelectAccount]);

  return (
    <Box style={styles.container}>
      {destAddress ? (
        <View style={styles.cellContainer}>
          <Cell
            key={destAddress}
            variant={CellVariant.Select}
            title={'Receive at'}
            secondaryText={formatAddress(destAddress, 'short')}
            showSecondaryTextIcon={false}
            avatarProps={{
              variant: AvatarVariant.Account,
              type: accountAvatarType,
              accountAddress: destAddress,
              style: { alignSelf: 'center', marginRight: 10 }
            }}
          >
            <View style={styles.closeButtonContainer}>
              <ButtonIcon
                onPress={() => handleSelectAccount(undefined)}
                iconName={IconName.Close}
              />
            </View>
          </Cell>
        </View>
      ) : (
        <Box>
          <AccountSelectorList
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
