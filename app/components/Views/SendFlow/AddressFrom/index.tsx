import React from 'react';
import { AddressFrom } from '../../../UI/AddressInputs';
import {useSelector, useDispatch} from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
    selectTicker,
  } from '../../../../selectors/networkController';
import Routes from '../../../../constants/navigation/Routes';
import { renderFromWei } from '../../../../util/number';
import { getTicker, getEther } from '../../../../util/transactions';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import { hexToBN } from '@metamask/controller-utils';
import {
    setSelectedAsset,
  } from '../../../../actions/transaction';
import {SFAddressFromProps, SelectedAsset} from './types'

export const SendToAddressFrom = ({accountAddress, accountName, accountBalance, updateAccountInfo}: SFAddressFromProps) => {
   
    const navigation = useNavigation();
    const identities = useSelector(
        (state: any) =>
          state.engine.backgroundState.PreferencesController.identities,
      );
    
      const accounts = useSelector(
        (state: any) => state.engine.backgroundState.AccountTrackerController.accounts,
        );
        const ticker = useSelector(selectTicker);        

        const dispatch = useDispatch();

        const selectedAssetAction = (selectedAsset: SelectedAsset) => dispatch(setSelectedAsset(selectedAsset))

    const onSelectAccount = async (accountAddress: string) => {
        const { name } = identities[accountAddress];
        const accountBalance = `${renderFromWei(
          accounts[accountAddress].balance,
        )} ${getTicker(ticker)}`;
        const ens = await doENSReverseLookup(accountAddress);
        const accountName = ens || name;        
        selectedAssetAction(getEther(ticker));
        const balanceIsZero = hexToBN(accounts[accountAddress].balance).isZero()
        updateAccountInfo({accountAddress, accountName, accountBalance, balanceIsZero});
      };

    const openAccountSelector = () => {
        navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
          screen: Routes.SHEET.ACCOUNT_SELECTOR,
          params: {
            isSelectOnly: true,
            onSelectAccount: onSelectAccount,
          },
        });
      };

  return (
      <AddressFrom 
       onPressIcon={openAccountSelector}
       fromAccountAddress={accountAddress}
       fromAccountName={accountName}
       fromAccountBalance={accountBalance}
      />
  );
};