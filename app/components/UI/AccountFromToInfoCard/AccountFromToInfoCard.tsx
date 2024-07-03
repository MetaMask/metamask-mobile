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
import { useAccounts } from '../../../components/hooks/useAccounts';

const AccountFromToInfoCard = (props: AccountFromToInfoCardProps) => {
  const {
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
  const { accounts } = useAccounts();

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
        const found = accounts.find(
          (account) =>
            account.address.toLowerCase() === fromAddress.toLowerCase(),
        );
        if (found) {
          const { name: fromName } = found;
          setFromAccountName(fromName);
        }
      }
    })();
  }, [fromAddress, accounts, transactionFromName, chainId]);

  useEffect(() => {
    if (existingToAddress) {
      setToAccountName(existingToAddress?.name);
      return;
    }
    (async () => {
      const toEns = await doENSReverseLookup(toAddress, chainId);
      const found = accounts.find(
        (account) => account.address.toLowerCase() === toAddress.toLowerCase(),
      );
      if (toEns) {
        setToAccountName(toEns);
      } else if (found) {
        const { name: toName } = found;
        setToAccountName(toName);
      }
    })();
  }, [existingToAddress, accounts, chainId, toAddress, transactionToName]);

  useEffect(() => {
    const accountNames = accounts?.map((account) => account.name) || [];
    const isOwnAccount = ensRecipient && accountNames.includes(ensRecipient);
    if (ensRecipient && !isOwnAccount) {
      setConfusableCollection(collectConfusables(ensRecipient));
    }
  }, [accounts, ensRecipient]);

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
  chainId: selectChainId(state),
  ticker: selectTicker(state),
});

export default connect(mapStateToProps)(AccountFromToInfoCard);
