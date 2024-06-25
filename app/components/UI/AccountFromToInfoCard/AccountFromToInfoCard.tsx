import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Text, TouchableOpacity, View } from 'react-native';

import TransactionTypes from '../../../core/TransactionTypes';
import useAddressBalance from '../../../components/hooks/useAddressBalance/useAddressBalance';
import { strings } from '../../../../locales/i18n';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import { collectConfusables } from '../../../util/confusables';
import { decodeTransferData } from '../../../util/transactions';
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { safeToChecksumAddress } from '../../../util/address';
import { useTheme } from '../../../util/theme';
import InfoModal from '../Swaps/components/InfoModal';
import useExistingAddress from '../../hooks/useExistingAddress';
import { AddressFrom, AddressTo } from '../AddressInputs';
import createStyles from './AccountFromToInfoCard.styles';
import { AccountFromToInfoCardProps } from './AccountFromToInfoCard.types';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { toLowerCaseEquals } from '../../../util/general';

const AccountFromToInfoCard = (props: AccountFromToInfoCardProps) => {
  const {
    internalAccounts,
    chainId,
    onPressFromAddressIcon,
    ticker,
    transactionState,
    layout = 'horizontal',
  } = props;
  const {
    transaction: { from: rawFromAddress, data, to },
    transactionTo,
    transactionToName,
    transactionFromName,
    selectedAsset,
    ensRecipient,
  } = transactionState;

  const fromAddress = safeToChecksumAddress(rawFromAddress);

  const [toAddress, setToAddress] = useState(transactionTo || to);
  const [fromAccountName, setFromAccountName] = useState<string>();
  const [toAccountName, setToAccountName] = useState<string>();
  const [confusableCollection, setConfusableCollection] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState<boolean>();

  const existingToAddress = useExistingAddress(toAddress);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { addressBalance: fromAccountBalance } = useAddressBalance(
    selectedAsset,
    fromAddress,
  );

  useEffect(() => {
    if (!fromAddress) {
      return;
    }
    if (transactionFromName) {
      setFromAccountName(transactionFromName);
      return;
    }
    (async () => {
      const fromEns = await doENSReverseLookup(fromAddress, chainId);
      if (fromEns) {
        setFromAccountName(fromEns);
      } else {
        const accountWithMatchingFromAddress = internalAccounts.find(
          (account) => toLowerCaseEquals(account.address, fromAddress),
        );
        if (accountWithMatchingFromAddress) {
          setFromAccountName(accountWithMatchingFromAddress.metadata.name);
        } else {
          setFromAccountName(fromAddress);
        }
      }
    })();
  }, [fromAddress, transactionFromName, chainId, internalAccounts]);

  useEffect(() => {
    if (existingToAddress) {
      setToAccountName(existingToAddress?.name);
      return;
    }
    (async () => {
      const toEns = await doENSReverseLookup(toAddress, chainId);
      if (toEns) {
        setToAccountName(toEns);
      } else {
        const accountWithMatchingToAddress = internalAccounts.find((account) =>
          toLowerCaseEquals(account.address, toAddress),
        );
        if (accountWithMatchingToAddress) {
          setToAccountName(accountWithMatchingToAddress.metadata.name);
        } else {
          setToAccountName(toAddress);
        }
      }
    })();
  }, [
    existingToAddress,
    chainId,
    toAddress,
    transactionToName,
    internalAccounts,
  ]);

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
      layout={layout}
      toAddressName={toAccountName}
      toSelectedAddress={toAddress}
    />
  );

  return (
    <>
      <View style={styles.inputWrapper}>
        {fromAddress && (
          <AddressFrom
            fromAccountAddress={fromAddress}
            fromAccountName={fromAccountName}
            fromAccountBalance={fromAccountBalance}
            layout={layout}
            onPressIcon={onPressFromAddressIcon}
          />
        )}
        {existingToAddress === undefined && confusableCollection.length ? (
          <TouchableOpacity onPress={() => setShowWarningModal(true)}>
            {addressTo}
          </TouchableOpacity>
        ) : (
          addressTo
        )}
      </View>
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
    </>
  );
};

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapStateToProps = (state: any) => ({
  internalAccounts: selectInternalAccounts(state),
  chainId: selectChainId(state),
  ticker: selectTicker(state),
});

export default connect(mapStateToProps)(AccountFromToInfoCard);
