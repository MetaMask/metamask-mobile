import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Text, TouchableOpacity, View } from 'react-native';

import TransactionTypes from '../../../core/TransactionTypes';
import useAddressBalance from '../../../components/hooks/useAddressBalance/useAddressBalance';
import { strings } from '../../../../locales/i18n';
import {
  selectNetwork,
  selectTicker,
} from '../../../selectors/networkController';
import { selectIdentities } from '../../../selectors/preferencesController';
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

const AccountFromToInfoCard = (props: AccountFromToInfoCardProps) => {
  const {
    identities,
    network,
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
      const fromEns = await doENSReverseLookup(fromAddress, network);
      if (fromEns) {
        setFromAccountName(fromEns);
      } else {
        const { name: fromName } = identities[fromAddress];
        setFromAccountName(fromName);
      }
    })();
  }, [fromAddress, identities, transactionFromName, network]);

  useEffect(() => {
    if (existingToAddress) {
      setToAccountName(existingToAddress?.name);
      return;
    }
    (async () => {
      const toEns = await doENSReverseLookup(toAddress, network);
      if (toEns) {
        setToAccountName(toEns);
      } else if (identities[toAddress]) {
        const { name: toName } = identities[toAddress];
        setToAccountName(toName);
      }
    })();
  }, [existingToAddress, identities, network, toAddress, transactionToName]);

  useEffect(() => {
    const accountNames =
      (identities &&
        Object.keys(identities).map((hash) => identities[hash].name)) ||
      [];
    const isOwnAccount = ensRecipient && accountNames.includes(ensRecipient);
    if (ensRecipient && !isOwnAccount) {
      setConfusableCollection(collectConfusables(ensRecipient));
    }
  }, [identities, ensRecipient]);

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

const mapStateToProps = (state: any) => ({
  identities: selectIdentities(state),
  network: selectNetwork(state),
  ticker: selectTicker(state),
});

export default connect(mapStateToProps)(AccountFromToInfoCard);
