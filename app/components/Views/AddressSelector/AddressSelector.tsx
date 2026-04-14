import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { selectSelectedAccountGroupId } from '../../../selectors/multichainAccounts/accountTreeController';

import { useDispatch, useSelector } from 'react-redux';
import { setReloadAccounts } from '../../../actions/accounts';
import { RootState } from '../../../reducers';
import { AddressSelectorParams } from './AddressSelector.types';
import { AccountGroupId } from '@metamask/account-api';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { isCaipChainId } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { MultichainAddressRow } from '../../../component-library/components-temp/MultichainAccounts';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import ListItemSelect from '../../../component-library/components/List/ListItemSelect';
import PickerAccount from '../../../component-library/components/Pickers/PickerAccount';
import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { selectInternalAccountListSpreadByScopesByGroupId } from '../../../selectors/multichainAccounts/accounts';
import {
  selectChainId,
  selectNetworkConfigurationsByCaipChainId,
} from '../../../selectors/networkController';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import { useAccountName } from '../../hooks/useAccountName';
import { createAccountSelectorNavDetails } from '../AccountSelector';
import { NetworkConfiguration } from '@metamask/network-controller';
import { strings } from '../../../../locales/i18n';
import { AddressSelectorSelectors } from './AddressSelector.testIds';

export const createAddressSelectorNavDetails =
  createNavigationDetails<AddressSelectorParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.ADDRESS_SELECTOR,
  );

const AddressSelector = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { displayOnlyCaipChainIds, isEvmOnly } =
    useParams<AddressSelectorParams>();
  const sheetRef = useRef<BottomSheetRef>(null);

  const networksByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );
  const selectedChainId = useSelector(selectChainId);

  const reloadAccounts = useSelector(
    (state: RootState) => state.accounts.reloadAccounts,
  );

  const selectInternalAccountsSpreadByScopes = useSelector(
    selectInternalAccountListSpreadByScopesByGroupId,
  );
  const selectedAccountGroupId = useSelector(selectSelectedAccountGroupId);
  const internalAccountsSpreadByScopes = selectInternalAccountsSpreadByScopes(
    selectedAccountGroupId as AccountGroupId,
  );

  const accountName = useAccountName();
  const selectedCaipChainId = isCaipChainId(selectedChainId)
    ? selectedChainId
    : toEvmCaipChainId(selectedChainId);

  useEffect(() => {
    if (reloadAccounts) {
      dispatch(setReloadAccounts(false));
    }
  }, [dispatch, reloadAccounts]);

  const handleAccountSelectorPress = useCallback(
    () =>
      navigation.navigate(
        ...createAccountSelectorNavDetails({
          isSelectOnly: true,
        }),
      ),
    [navigation],
  );

  const handleItemPress = useCallback(
    async (item: (typeof internalAccountsSpreadByScopes)[0]) => {
      const networkConfiguration = networksByCaipChainId[
        item.scope
      ] as NetworkConfiguration;
      if (!networkConfiguration) return;

      const { rpcEndpoints, defaultRpcEndpointIndex } = networkConfiguration;
      let itemNetworkClientId;
      if (!rpcEndpoints || rpcEndpoints.length === 0) {
        itemNetworkClientId = item.scope;
      } else {
        const { networkClientId } =
          rpcEndpoints?.[defaultRpcEndpointIndex] ?? {};
        itemNetworkClientId = networkClientId;
      }

      const { MultichainNetworkController } = Engine.context;
      sheetRef.current?.onCloseBottomSheet();
      await MultichainNetworkController.setActiveNetwork(itemNetworkClientId);
    },
    [networksByCaipChainId],
  );

  const renderAddressItem = useCallback(
    ({ item }: { item: (typeof internalAccountsSpreadByScopes)[number] }) => (
      <ListItemSelect
        isSelected={selectedCaipChainId === item.scope}
        onPress={() => handleItemPress(item)}
      >
        <MultichainAddressRow
          chainId={item.scope}
          networkName={item.networkName}
          address={item.account.address}
          // @ts-expect-error MultichainAddressRow doesn't have twClassName in types
          twClassName="p-0 gap-4 bg-default"
        />
      </ListItemSelect>
    ),
    [selectedCaipChainId, handleItemPress],
  );

  const filteredInternalAccountsSpreadByScopes = useMemo(() => {
    let filteredAccounts = internalAccountsSpreadByScopes;
    if (isEvmOnly) {
      filteredAccounts = filteredAccounts.filter((account) =>
        account.scope.startsWith('eip155:'),
      );
    }
    if (displayOnlyCaipChainIds && displayOnlyCaipChainIds.length > 0) {
      filteredAccounts = filteredAccounts.filter((account) =>
        displayOnlyCaipChainIds.includes(account.scope),
      );
    }

    return filteredAccounts;
  }, [internalAccountsSpreadByScopes, isEvmOnly, displayOnlyCaipChainIds]);

  return (
    <BottomSheet ref={sheetRef} isFullscreen>
      <BottomSheetHeader onClose={() => sheetRef.current?.onCloseBottomSheet()}>
        {strings('address_selector.select_an_address')}
      </BottomSheetHeader>
      <Box
        justifyContent={BoxJustifyContent.Center}
        alignItems={BoxAlignItems.Center}
        flexDirection={BoxFlexDirection.Row}
      >
        <PickerAccount
          accountName={accountName}
          onPress={handleAccountSelectorPress}
          testID={AddressSelectorSelectors.ACCOUNT_PICKER_DROPDOWN}
        />
      </Box>

      <FlashList
        data={filteredInternalAccountsSpreadByScopes}
        keyExtractor={(item: (typeof internalAccountsSpreadByScopes)[number]) =>
          item.scope
        }
        renderItem={renderAddressItem}
        extraData={selectedCaipChainId}
      />
    </BottomSheet>
  );
};

export default AddressSelector;
