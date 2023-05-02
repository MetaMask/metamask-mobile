import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { hexToBN } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';

import { setSelectedAsset } from '../../../../actions/transaction';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectNetwork,
  selectTicker,
} from '../../../../selectors/networkController';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import { renderFromWei } from '../../../../util/number';
import { getEther, getTicker } from '../../../../util/transactions';
import { AddressFrom } from '../../../UI/AddressInputs';
import { SFAddressFromProps } from './AddressFrom.types';

const SendFlowAddressFrom = ({
  fromAccountBalanceState,
}: SFAddressFromProps) => {
  const navigation = useNavigation();
  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const accounts = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const network = useSelector((state: any) => selectNetwork(state));
  const ticker = useSelector(selectTicker);

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const [accountAddress, setAccountAddress] = useState(selectedAddress);
  const [accountName, setAccountName] = useState(
    identities[selectedAddress].name,
  );
  const [accountBalance, setAccountBalance] = useState('');

  useEffect(() => {
    async function getAccount() {
      const ens = await doENSReverseLookup(selectedAddress, network);
      const balance = `${renderFromWei(
        accounts[selectedAddress].balance,
      )} ${getTicker(ticker)}`;
      const balanceIsZero = hexToBN(accounts[selectedAddress].balance).isZero();
      setAccountName(ens || identities[selectedAddress].name);
      setAccountBalance(balance);
      fromAccountBalanceState(balanceIsZero);
    }
    getAccount();
  }, [
    accounts,
    selectedAddress,
    ticker,
    network,
    identities,
    fromAccountBalanceState,
  ]);

  const dispatch = useDispatch();

  const selectedAssetAction = (selectedAsset: any) =>
    dispatch(setSelectedAsset(selectedAsset));

  const onSelectAccount = async (address: string) => {
    const { name } = identities[address];
    const balance = `${renderFromWei(accounts[address].balance)} ${getTicker(
      ticker,
    )}`;
    const ens = await doENSReverseLookup(address);
    const accName = ens || name;
    const balanceIsZero = hexToBN(accounts[address].balance).isZero();
    selectedAssetAction(getEther(ticker));
    setAccountAddress(address);
    setAccountName(accName);
    setAccountBalance(balance);
    fromAccountBalanceState(balanceIsZero);
  };

  const openAccountSelector = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
      params: {
        isSelectOnly: true,
        onSelectAccount,
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

export default SendFlowAddressFrom;
