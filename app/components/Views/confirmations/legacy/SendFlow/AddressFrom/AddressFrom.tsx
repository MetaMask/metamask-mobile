import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  newAssetTransaction,
  setSelectedAsset,
} from '../../../../../../actions/transaction';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectAccountsByChainId } from '../../../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccount } from '../../../../../../selectors/accountsController';
import { doENSReverseLookup } from '../../../../../../util/ENSUtils';
import { renderFromWei, hexToBN } from '../../../../../../util/number';
import { getEther, getTicker } from '../../../../../../util/transactions';
import { AddressFrom } from '../../../../../UI/AddressInputs';
import { SFAddressFromProps } from './AddressFrom.types';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { selectNativeCurrencyByChainId } from '../../../../../../selectors/networkController';
import { RootState } from '../../../../../../reducers';
import { Hex } from '@metamask/utils';
import { formatWithThreshold } from '../../../../../../util/assets';
import I18n from '../../../../../../../locales/i18n';
import { selectIsEvmNetworkSelected } from '../../../../../../selectors/multichainNetworkController';

const SendFlowAddressFrom = ({
  chainId,
  fromAccountBalanceState,
  setFromAddress,
}: SFAddressFromProps) => {
  const navigation = useNavigation();

  const ticker = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId as Hex),
  );
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const accounts = accountsByChainId[chainId];

  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const checksummedSelectedAddress = selectedInternalAccount
    ? toChecksumHexAddress(selectedInternalAccount.address)
    : null;

  const [accountAddress, setAccountAddress] = useState(
    checksummedSelectedAddress,
  );
  const [accountName, setAccountName] = useState(
    selectedInternalAccount?.metadata.name,
  );
  const [accountBalance, setAccountBalance] = useState('');

  const dispatch = useDispatch();

  const selectedAsset = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.transaction.selectedAsset,
  );

  const selectedAssetAction = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (asset: any) => dispatch(setSelectedAsset(asset)),
    [dispatch],
  );

  const newAssetTransactionAction = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (asset: any) => dispatch(newAssetTransaction(asset)),
    [dispatch],
  );

  const selectedAssetRef = useRef(selectedAsset);

  const calculateBalance = useCallback(
    (address: string) => {
      let balance = '';
      let balanceIsZero = true;

      if (!isEvmSelected) {
        // For non-EVM accounts like Solana, use the asset balance from selectedAsset
        if (selectedAsset?.balance) {
          const minimumDisplayThreshold = 0.00001;
          balance = `${formatWithThreshold(
            parseFloat(selectedAsset.balance),
            minimumDisplayThreshold,
            I18n.locale,
            { minimumFractionDigits: 0, maximumFractionDigits: 5 },
          )} ${selectedAsset.symbol || getTicker(ticker)}`;
          balanceIsZero = parseFloat(selectedAsset.balance) === 0;
        }
      } else if (accounts?.[address]) {
        // For EVM accounts, use the balance from accounts object
        balance = `${renderFromWei(accounts[address].balance)} ${getTicker(
          ticker,
        )}`;
        balanceIsZero = hexToBN(accounts[address].balance).isZero();
      }

      return { balance, balanceIsZero };
    },
    [isEvmSelected, selectedAsset, accounts, ticker],
  );

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
      if (checksummedSelectedAddress) {
        const ens = await doENSReverseLookup(
          checksummedSelectedAddress,
          chainId,
        );

        const { balance, balanceIsZero } = calculateBalance(
          checksummedSelectedAddress,
        );

        setAccountName(ens || selectedInternalAccount?.metadata.name);
        setAccountBalance(balance);
        fromAccountBalanceState(balanceIsZero);
      }
    }
    getAccount();
  }, [
    calculateBalance,
    checksummedSelectedAddress,
    chainId,
    fromAccountBalanceState,
    selectedInternalAccount?.metadata.name,
  ]);

  const onSelectAccount = async (address: string) => {
    const name = selectedInternalAccount?.metadata.name;
    const { balance, balanceIsZero } = calculateBalance(address);

    const ens = await doENSReverseLookup(address);
    const accName = ens || name;

    selectedAssetAction(getEther(ticker as string));
    setAccountAddress(address);
    setAccountName(accName);
    setAccountBalance(balance);
    fromAccountBalanceState(balanceIsZero);
    setFromAddress(address);
  };

  const openAccountSelector = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
      params: {
        isSelectOnly: true,
        onSelectAccount,
        disablePrivacyMode: true,
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
