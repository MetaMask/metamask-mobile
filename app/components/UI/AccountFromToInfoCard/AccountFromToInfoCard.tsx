import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Text, TouchableOpacity, View } from 'react-native';

import TransactionTypes from '../../../core/TransactionTypes';
import { strings } from '../../../../locales/i18n';
import {
  selectEvmChainId,
  selectEvmTicker,
} from '../../../selectors/networkController';
import { collectConfusables } from '../../../util/confusables';
import { decodeTransferData } from '../../../util/transactions';
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { areAddressesEqual, toFormattedAddress } from '../../../util/address';
import { useTheme } from '../../../util/theme';
import InfoModal from '../../Base/InfoModal';
import useExistingAddress from '../../hooks/useExistingAddress';
import { AddressTo } from '../AddressInputs';
import createStyles from './AccountFromToInfoCard.styles';
import { AccountFromToInfoCardProps } from './AccountFromToInfoCard.types';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { RootState } from '../../../reducers';
import AddressFrom from './AddressFrom';

const AccountFromToInfoCard = (props: AccountFromToInfoCardProps) => {
  const { internalAccounts, chainId, ticker, transactionState, origin } = props;
  const {
    transaction: { from: rawFromAddress, data, to },
    transactionTo,
    transactionFromName,
    selectedAsset,
    ensRecipient,
  } = transactionState;

  const fromAddress = toFormattedAddress(rawFromAddress);

  const [toAddress, setToAddress] = useState(transactionTo || to);
  const [fromAccountName, setFromAccountName] = useState<string>();
  const [toAccountName, setToAccountName] = useState<string>();
  const [confusableCollection, setConfusableCollection] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState<boolean>();

  const existingToAddress = useExistingAddress(toAddress);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const fetchFromAccountDetails = async () => {
      if (!fromAddress) {
        return;
      }

      if (transactionFromName) {
        if (fromAccountName !== transactionFromName) {
          setFromAccountName(transactionFromName);
        }
        return;
      }

      const fromEns = await doENSReverseLookup(fromAddress, chainId);
      if (fromEns) {
        if (fromAccountName !== fromEns) {
          setFromAccountName(fromEns);
        }
      } else {
        const accountWithMatchingFromAddress = internalAccounts.find(
          (account) => areAddressesEqual(account.address, fromAddress),
        );

        const newName = accountWithMatchingFromAddress
          ? accountWithMatchingFromAddress.metadata.name
          : fromAddress;

        if (fromAccountName !== newName) {
          setFromAccountName(newName);
        }
      }
    };

    fetchFromAccountDetails();
  }, [
    fromAddress,
    transactionFromName,
    chainId,
    internalAccounts,
    fromAccountName,
  ]);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (existingToAddress) {
        if (toAccountName !== existingToAddress.name) {
          setToAccountName(existingToAddress.name);
        }
        return;
      }

      const toEns = await doENSReverseLookup(toAddress, chainId);
      if (toEns) {
        if (toAccountName !== toEns) {
          setToAccountName(toEns);
        }
      } else {
        const accountWithMatchingToAddress = internalAccounts.find((account) =>
          areAddressesEqual(account.address, toAddress),
        );

        const newName = accountWithMatchingToAddress
          ? accountWithMatchingToAddress.metadata.name
          : toAddress;

        if (toAccountName !== newName) {
          setToAccountName(newName);
        }
      }
    };

    fetchAccountDetails();
  }, [existingToAddress, chainId, toAddress, internalAccounts, toAccountName]);

  useEffect(() => {
    const accountNames = internalAccounts.map(
      (account) => account.metadata.name,
    );
    const isOwnAccount = ensRecipient && accountNames.includes(ensRecipient);
    if (ensRecipient && !isOwnAccount) {
      setConfusableCollection(collectConfusables(ensRecipient));
    }
  }, [internalAccounts, ensRecipient]);

  useEffect(() => {
    let toAddr;
    if (selectedAsset.isETH || selectedAsset.tokenId) {
      if (
        selectedAsset.standard !== TransactionTypes.ASSET.ERC721 &&
        selectedAsset.standard !== TransactionTypes.ASSET.ERC1155
      ) {
        toAddr = to;
      }
      if (!fromAddress) {
        return;
      }
    } else if (data) {
      const result = decodeTransferData('transfer', data) as string[];
      toAddr = result[0];
    }
    if (toAddr) {
      setToAddress(toAddr);
    }
  }, [data, fromAddress, selectedAsset, ticker, to]);

  const addressTo = (
    <AddressTo
      addressToReady
      confusableCollection={
        (existingToAddress === undefined && confusableCollection) || []
      }
      displayExclamation={
        existingToAddress === undefined && !!confusableCollection.length
      }
      isConfirmScreen
      layout="vertical"
      toAddressName={toAccountName}
      toSelectedAddress={toAddress}
    />
  );

  return (
    <View style={styles.container}>
      {fromAddress && (
        <AddressFrom
          chainId={transactionState?.chainId}
          asset={selectedAsset}
          from={fromAddress}
          origin={origin}
        />
      )}
      {existingToAddress === undefined && confusableCollection.length ? (
        <TouchableOpacity onPress={() => setShowWarningModal(true)}>
          {addressTo}
        </TouchableOpacity>
      ) : (
        addressTo
      )}
      <InfoModal
        body={
          <Text style={styles.text}>
            {strings('transaction.confusable_msg')}
          </Text>
        }
        isVisible={showWarningModal}
        title={strings('transaction.confusable_title')}
        toggleModal={() => setShowWarningModal(!showWarningModal)}
      />
    </View>
  );
};

const mapStateToProps = (state: RootState) => ({
  internalAccounts: selectInternalAccounts(state),
  chainId: selectEvmChainId(state),
  ticker: selectEvmTicker(state),
});

export default connect(mapStateToProps)(AccountFromToInfoCard);
