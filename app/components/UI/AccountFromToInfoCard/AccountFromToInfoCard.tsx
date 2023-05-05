import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Text, TouchableOpacity, View } from 'react-native';

import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import TransactionTypes from '../../../core/TransactionTypes';
import {
  selectNetwork,
  selectTicker,
} from '../../../selectors/networkController';
import { collectConfusables } from '../../../util/confusables';
import { decodeTransferData, getTicker } from '../../../util/transactions';
import { doENSReverseLookup } from '../../../util/ENSUtils';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
} from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import { useTheme } from '../../../util/theme';
import InfoModal from '../Swaps/components/InfoModal';
import { AddressFrom, AddressTo } from '../AddressInputs';
import createStyles from './AccountFromToInfoCard.styles';
import { AccountFromToInfoCardProps } from './AccountFromToInfoCard.types';

const AccountFromToInfoCard = (props: AccountFromToInfoCardProps) => {
  const {
    accounts,
    addressBook,
    contractBalances,
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
  const [isExistingContact, setIsExistingContact] = useState<boolean>();
  const [confusableCollection, setConfusableCollection] = useState([]);
  const [fromAccountBalance, setFromAccountBalance] = useState<string>();
  const [showWarningModal, setShowWarningModal] = useState<boolean>();

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    if (!fromAddress) {
      return;
    }
    if (transactionFromName) {
      setFromAccountName(transactionFromName);
      return;
    }
    (async () => {
      const { name: fromName } = identities[fromAddress];
      const fromEns = await doENSReverseLookup(fromAddress);
      setFromAccountName(fromEns || fromName);
    })();
  }, [fromAddress, identities, transactionFromName]);

  useEffect(() => {
    const existingContact =
      toAddress && addressBook[network] && addressBook[network][toAddress];
    setIsExistingContact(existingContact !== undefined);
    if (existingContact) {
      setToAccountName(existingContact.name);
      return;
    }
    (async () => {
      if (identities[toAddress]) {
        const { name: toName } = identities[toAddress];
        const toEns = await doENSReverseLookup(toAddress);
        setToAccountName(toEns || toName);
      }
    })();
  }, [addressBook, identities, network, toAddress, transactionToName]);

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
    if (!selectedAsset.isETH && !selectedAsset.tokenId) {
      const {
        address: rawAddress,
        symbol = 'ERC20',
        decimals,
        image,
        name,
      } = selectedAsset;
      const address = safeToChecksumAddress(rawAddress);
      const { TokensController } = Engine.context as any;
      if (!address) {
        return;
      }
      if (!contractBalances[address]) {
        TokensController.addToken(address, symbol, decimals, image, name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let fromAccBalance;
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
      const parsedTicker = getTicker(ticker);
      fromAccBalance = `${renderFromWei(
        accounts[fromAddress]?.balance,
      )} ${parsedTicker}`;
    } else {
      if (data) {
        const result = decodeTransferData('transfer', data) as string[];
        toAddr = result[0];
      }
      const { address: rawAddress, symbol = 'ERC20', decimals } = selectedAsset;
      const address = safeToChecksumAddress(rawAddress);
      if (!address) {
        return;
      }
      if (contractBalances[address]) {
        fromAccBalance = `${renderFromTokenMinimalUnit(
          contractBalances[address] ? contractBalances[address] : '0',
          decimals,
        )} ${symbol}`;
      }
    }
    if (toAddr) {
      setToAddress(toAddr);
    }
    setFromAccountBalance(fromAccBalance);
  }, [
    accounts,
    contractBalances,
    data,
    fromAddress,
    selectedAsset,
    ticker,
    to,
  ]);

  const addressTo = (
    <AddressTo
      addressToReady
      confusableCollection={(!isExistingContact && confusableCollection) || []}
      displayExclamation={!isExistingContact && !!confusableCollection.length}
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
        {!isExistingContact && confusableCollection.length ? (
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
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  addressBook: state.engine.backgroundState.AddressBookController?.addressBook,
  contractBalances:
    state.engine.backgroundState.TokenBalancesController.contractBalances,
  identities: state.engine.backgroundState.PreferencesController.identities,
  network: selectNetwork(state),
  ticker: selectTicker(state),
});

export default connect(mapStateToProps)(AccountFromToInfoCard);
