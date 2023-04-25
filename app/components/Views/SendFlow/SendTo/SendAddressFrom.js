import React, { useEffect } from 'react';
import { AddressFrom } from '../../../UI/AddressInputs';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  selectTicker,
  selectNetwork,
} from '../../../../selectors/networkController';
import Routes from '../../../../constants/navigation/Routes';
import { renderFromWei } from '../../../../util/number';
import { getTicker, getEther } from '../../../../util/transactions';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import { hexToBN } from '@metamask/controller-utils';
import { setSelectedAsset } from '../../../../actions/transaction';

const SendToAddressFrom = () => {
  const navigation = useNavigation();
  const identities = useSelector(
    (state) => state.engine.backgroundState.PreferencesController.identities,
  );

  const accounts = useSelector(
    (state) => state.engine.backgroundState.AccountTrackerController.accounts,
  );

  const network = useSelector((state) => selectNetwork(state));
  const ticker = useSelector(selectTicker);

  const selectedAddress = useSelector(
    (state) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const [state, setState] = React.useState({
    address: '',
    accName: '',
    balance: '',
    isBalanceZero: false,
  });

  useEffect(() => {
    async function getAccount() {
      const ens = await doENSReverseLookup(selectedAddress, network);
      const fromAccountBalance1 = `${renderFromWei(
        accounts[selectedAddress].balance,
      )} ${getTicker(ticker)}`;
      setState({
        ...state,
        balance: fromAccountBalance1,
        accName: ens || identities[selectedAddress].name,
        balanceIsZero: hexToBN(accounts[selectedAddress].balance).isZero(),
      });
    }
    getAccount();
  }, [accounts, selectedAddress, ticker, state.balance, state.accName]);

  const dispatch = useDispatch();

  const selectedAssetAction = (selectedAsset) =>
    dispatch(setSelectedAsset(selectedAsset));

  const onSelectAccount = async (address) => {
    const { name } = identities[address];
    const balance = `${renderFromWei(accounts[address].balance)} ${getTicker(
      ticker,
    )}`;
    const ens = await doENSReverseLookup(address);
    const accName = ens || name;
    selectedAssetAction(getEther(ticker));
    const isBalanceZero = hexToBN(accounts[address].balance).isZero();
    setState({
      address,
      accName,
      balance,
      isBalanceZero,
    });
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

  const { address, balance, accName } = state;

  return (
    <AddressFrom
      onPressIcon={openAccountSelector}
      fromAccountAddress={address}
      fromAccountName={accName}
      fromAccountBalance={balance}
    />
  );
};

export default SendToAddressFrom;
