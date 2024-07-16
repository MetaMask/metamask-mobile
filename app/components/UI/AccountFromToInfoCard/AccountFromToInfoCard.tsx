import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { Text, TouchableOpacity, View } from 'react-native';
import Logger from '../../../util/Logger';

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
import { RootState } from '../../../reducers';

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
    const fetchFromAccountDetails = async () => {
      Logger.log('Starting ENS resolution process for fromAddress');
      if (!fromAddress) {
        Logger.log('No fromAddress provided, skipping ENS resolution');
        return;
      }

      if (transactionFromName) {
        Logger.log(
          `Using provided transactionFromName: ${transactionFromName}`,
        );
        if (fromAccountName !== transactionFromName) {
          setFromAccountName(transactionFromName);
          Logger.log(`Updated fromAccountName to: ${transactionFromName}`);
        }
        return;
      }

      Logger.log(`Resolving ENS for fromAddress: ${fromAddress}`);
      const fromEns = await doENSReverseLookup(fromAddress, chainId);
      if (fromEns) {
        Logger.log(`ENS resolution result for fromAddress: ${fromEns}`);
        if (fromAccountName !== fromEns) {
          setFromAccountName(fromEns);
          Logger.log(`Updated fromAccountName to ENS: ${fromEns}`);
        }
      } else {
        Logger.log('No ENS found, searching for matching internal account');
        const accountWithMatchingFromAddress = internalAccounts.find(
          (account) => toLowerCaseEquals(account.address, fromAddress),
        );

        const newName = accountWithMatchingFromAddress
          ? accountWithMatchingFromAddress.metadata.name
          : fromAddress;

        if (fromAccountName !== newName) {
          setFromAccountName(newName);
          Logger.log(`Updated fromAccountName to: ${newName}`);
        }
      }
      Logger.log('ENS resolution process for fromAddress completed');
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
      Logger.log('Starting ENS resolution process for toAddress');
      if (existingToAddress) {
        Logger.log(`Using existing toAddress: ${existingToAddress.name}`);
        if (toAccountName !== existingToAddress.name) {
          setToAccountName(existingToAddress.name);
          Logger.log(`Updated toAccountName to: ${existingToAddress.name}`);
        }
        return;
      }

      Logger.log(`Resolving ENS for toAddress: ${toAddress}`);
      const toEns = await doENSReverseLookup(toAddress, chainId);
      if (toEns) {
        Logger.log(`ENS resolution result for toAddress: ${toEns}`);
        if (toAccountName !== toEns) {
          setToAccountName(toEns);
          Logger.log(`Updated toAccountName to ENS: ${toEns}`);
        }
      } else {
        Logger.log('No ENS found, searching for matching internal account');
        const accountWithMatchingToAddress = internalAccounts.find((account) =>
          toLowerCaseEquals(account.address, toAddress),
        );

        const newName = accountWithMatchingToAddress
          ? accountWithMatchingToAddress.metadata.name
          : toAddress;

        if (toAccountName !== newName) {
          setToAccountName(newName);
          Logger.log(`Updated toAccountName to: ${newName}`);
        }
      }
      Logger.log('ENS resolution process for toAddress completed');
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
      layout={layout}
      toAddressName={toAccountName}
      toSelectedAddress={toAddress}
    />
  );

  return (
    <>
      {Logger.log(
        `Rendering with fromAccountName: ${fromAccountName}, toAccountName: ${toAccountName}`,
      )}
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

const mapStateToProps = (state: RootState) => ({
  internalAccounts: selectInternalAccounts(state),
  chainId: selectChainId(state),
  ticker: selectTicker(state),
});

export default connect(mapStateToProps)(AccountFromToInfoCard);
