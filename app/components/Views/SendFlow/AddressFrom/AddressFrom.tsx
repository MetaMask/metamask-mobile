import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useNavigation } from '@react-navigation/native';

import {
  newAssetTransaction,
  setSelectedAsset,
} from '../../../../actions/transaction';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectNetwork,
  selectTicker,
} from '../../../../selectors/networkController';
import { selectAccounts } from '../../../../selectors/accountTrackerController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../../selectors/preferencesController';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import { renderFromWei, hexToBN } from '../../../../util/number';
import { getEther, getTicker } from '../../../../util/transactions';
import { AddressFrom } from '../../../UI/AddressInputs';
import { SFAddressFromProps } from './AddressFrom.types';

const SendFlowAddressFrom = ({
  fromAccountBalanceState,
}: SFAddressFromProps) => {
  const navigation = useNavigation();
  const identities = useSelector(selectIdentities);

  const accounts = useSelector(selectAccounts);

  const network = useSelector((state: any) => selectNetwork(state));
  const ticker = useSelector(selectTicker);

  const selectedAddress = useSelector(selectSelectedAddress);

  const [accountAddress, setAccountAddress] = useState(selectedAddress);
  const [accountName, setAccountName] = useState(
    identities[selectedAddress].name,
  );
  const [accountBalance, setAccountBalance] = useState('');

  const dispatch = useDispatch();

  const selectedAsset = useSelector(
    (state: any) => state.transaction.selectedAsset,
  );

  const selectedAssetAction = useCallback(
    (asset: any) => dispatch(setSelectedAsset(asset)),
    [dispatch],
  );

  const newAssetTransactionAction = useCallback(
    (asset: any) => dispatch(newAssetTransaction(asset)),
    [dispatch],
  );

  const selectedAssetRef = useRef(selectedAsset);

  useEffect(() => {
    if (
      selectedAssetRef.current.isETH ||
      Object.keys(selectedAssetRef.current).length === 0
    ) {
      newAssetTransactionAction(getEther(ticker as string));
      selectedAssetAction(getEther(ticker as string));
    } else {
      newAssetTransactionAction(selectedAssetRef.current);
    }
  }, [newAssetTransactionAction, selectedAssetAction, ticker]);

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

  const onSelectAccount = async (address: string) => {
    const { name } = identities[address];
    const balance = `${renderFromWei(accounts[address].balance)} ${getTicker(
      ticker,
    )}`;
    const ens = await doENSReverseLookup(address);
    const accName = ens || name;
    const balanceIsZero = hexToBN(accounts[address].balance).isZero();
    selectedAssetAction(getEther(ticker as string));
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
