import React, { useState, useEffect, useCallback } from 'react';

import { Alert } from 'react-native';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import { ethers } from 'ethers';
import abi from 'human-standard-token-abi';

import NotificationManager from '../../../core/NotificationManager';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { hexToBN, fromWei, isZeroValue } from '../../../util/number';
import {
  setEtherTransaction,
  setTransactionObject,
} from '../../../actions/transaction';
import WalletConnect from '../../../core/WalletConnect/WalletConnect';
import {
  getMethodData,
  TOKEN_METHOD_TRANSFER,
  getTokenValueParam,
  getTokenAddressParam,
  calcTokenAmount,
  getTokenValueParamAsHex,
  getIsSwapApproveOrSwapTransaction,
  isApprovalTransaction,
} from '../../../util/transactions';
import { BN } from 'ethereumjs-util';
import Logger from '../../../util/Logger';
import TransactionTypes from '../../../core/TransactionTypes';
import { swapsUtils } from '@metamask/swaps-controller';
import { query } from '@metamask/controller-utils';
import BigNumber from 'bignumber.js';
import { toLowerCaseEquals } from '../../../util/general';
import { KEYSTONE_TX_CANCELED } from '../../../constants/error';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  getAddressAccountType,
  isHardwareAccount,
} from '../../../util/address';

import {
  selectChainId,
  selectProviderType,
} from '../../../selectors/networkController';
import WatchAssetApproval from '../../Approvals/WatchAssetApproval';
import SignatureApproval from '../../Approvals/SignatureApproval';
import AddChainApproval from '../../Approvals/AddChainApproval';
import SwitchChainApproval from '../../Approvals/SwitchChainApproval';
import WalletConnectApproval from '../../Approvals/WalletConnectApproval';
import ConnectApproval from '../../Approvals/ConnectApproval';
import {
  TransactionApproval,
  TransactionModalType,
} from '../../Approvals/TransactionApproval';
import PermissionApproval from '../../Approvals/PermissionApproval';
import FlowLoaderModal from '../../Approvals/FlowLoaderModal';
import TemplateConfirmationModal from '../../Approvals/TemplateConfirmationModal';
import { selectTokenList } from '../../../selectors/tokenListController';
import { selectTokens } from '../../../selectors/tokensController';
import { getDeviceId } from '../../../core/Ledger/Ledger';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../selectors/accountsController';
import { createLedgerTransactionModalNavDetails } from '../../UI/LedgerModals/LedgerTransactionModal';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { STX_NO_HASH_ERROR } from '../../../util/smart-transactions/smart-publish-hook';
import { getSmartTransactionMetricsProperties } from '../../../util/smart-transactions';

///: BEGIN:ONLY_INCLUDE_IF(snaps)
import InstallSnapApproval from '../../Approvals/InstallSnapApproval';
///: END:ONLY_INCLUDE_IF

const hstInterface = new ethers.utils.Interface(abi);

const useSwapConfirmedEvent = ({ swapsTransactions, trackSwaps }) => {
  const [transactionMetaIdsForListening, setTransactionMetaIdsForListening] =
    useState([]);

  const addTransactionMetaIdForListening = (txMetaId) => {
    setTransactionMetaIdsForListening([
      ...transactionMetaIdsForListening,
      txMetaId,
    ]);
  };

  useEffect(() => {
    // Cannot directly call trackSwaps from the event listener in autoSign due to stale closure of swapsTransactions
    const { TransactionController } = Engine.context;
    const [txMetaId, ...restTxMetaIds] = transactionMetaIdsForListening;

    if (txMetaId && swapsTransactions[txMetaId]) {
      TransactionController.hub.once(
        `${txMetaId}:confirmed`,
        (transactionMeta) => {
          if (
            swapsTransactions[transactionMeta.id]?.analytics &&
            swapsTransactions[transactionMeta.id]?.paramsForAnalytics
          ) {
            trackSwaps(
              MetaMetricsEvents.SWAP_COMPLETED,
              transactionMeta,
              swapsTransactions,
            );
          }
        },
      );
      setTransactionMetaIdsForListening(restTxMetaIds);
    }
  }, [trackSwaps, transactionMetaIdsForListening, swapsTransactions]);

  return {
    addTransactionMetaIdForListening,
  };
};

const RootRPCMethodsUI = (props) => {
  const { trackEvent, trackAnonymousEvent } = useMetrics();
  const [transactionModalType, setTransactionModalType] = useState(undefined);
  const tokenList = useSelector(selectTokenList);
  const setTransactionObject = props.setTransactionObject;
  const setEtherTransaction = props.setEtherTransaction;

  const initializeWalletConnect = () => {
    WalletConnect.init();
  };

  const trackSwaps = useCallback(
    async (event, transactionMeta, swapsTransactions) => {
      try {
        const { TransactionController, SmartTransactionsController } =
          Engine.context;
        const newSwapsTransactions = swapsTransactions;
        const swapTransaction = newSwapsTransactions[transactionMeta.id];
        const {
          sentAt,
          gasEstimate,
          ethAccountBalance,
          approvalTransactionMetaId,
        } = swapTransaction.paramsForAnalytics;

        const approvalTransaction =
          TransactionController.state.transactions.find(
            ({ id }) => id === approvalTransactionMetaId,
          );
        const ethBalance = await query(
          TransactionController.ethQuery,
          'getBalance',
          [props.selectedAddress],
        );
        const receipt = await query(
          TransactionController.ethQuery,
          'getTransactionReceipt',
          [transactionMeta.hash],
        );

        const currentBlock = await query(
          TransactionController.ethQuery,
          'getBlockByHash',
          [receipt.blockHash, false],
        );
        let approvalReceipt;
        if (approvalTransaction?.hash) {
          approvalReceipt = await query(
            TransactionController.ethQuery,
            'getTransactionReceipt',
            [approvalTransaction.hash],
          );
        }
        const tokensReceived = swapsUtils.getSwapsTokensReceived(
          receipt,
          approvalReceipt,
          transactionMeta?.txParams,
          approvalTransaction?.txParams,
          swapTransaction.destinationToken,
          ethAccountBalance,
          ethBalance,
        );

        newSwapsTransactions[transactionMeta.id].gasUsed = receipt.gasUsed;
        if (tokensReceived) {
          newSwapsTransactions[transactionMeta.id].receivedDestinationAmount =
            new BigNumber(tokensReceived, 16).toString(10);
        }
        TransactionController.update({
          swapsTransactions: newSwapsTransactions,
        });

        const timeToMine = currentBlock.timestamp - sentAt;
        const estimatedVsUsedGasRatio = `${new BigNumber(receipt.gasUsed)
          .div(gasEstimate)
          .times(100)
          .toFixed(2)}%`;
        const quoteVsExecutionRatio = `${swapsUtils
          .calcTokenAmount(
            tokensReceived || '0x0',
            swapTransaction.destinationTokenDecimals,
          )
          .div(swapTransaction.destinationAmount)
          .times(100)
          .toFixed(2)}%`;
        const tokenToAmountReceived = swapsUtils.calcTokenAmount(
          tokensReceived,
          swapTransaction.destinationToken.decimals,
        );

        const analyticsParams = {
          ...swapTransaction.analytics,
          account_type: getAddressAccountType(transactionMeta.txParams.from),
        };
        delete newSwapsTransactions[transactionMeta.id].analytics;
        delete newSwapsTransactions[transactionMeta.id].paramsForAnalytics;

        const smartTransactionMetricsProperties =
          getSmartTransactionMetricsProperties(
            SmartTransactionsController,
            transactionMeta,
          );

        const parameters = {
          ...analyticsParams,
          time_to_mine: timeToMine,
          estimated_vs_used_gasRatio: estimatedVsUsedGasRatio,
          quote_vs_executionRatio: quoteVsExecutionRatio,
          token_to_amount_received: tokenToAmountReceived.toString(),
          is_smart_transaction: props.shouldUseSmartTransaction,
          ...smartTransactionMetricsProperties,
        };

        trackAnonymousEvent(event, parameters);
      } catch (e) {
        Logger.error(e, MetaMetricsEvents.SWAP_TRACKING_FAILED);
        trackEvent(MetaMetricsEvents.SWAP_TRACKING_FAILED, {
          error: e,
        });
      }
    },
    [
      props.selectedAddress,
      props.shouldUseSmartTransaction,
      trackAnonymousEvent,
      trackEvent,
    ],
  );

  const { addTransactionMetaIdForListening } = useSwapConfirmedEvent({
    swapsTransactions: props.swapsTransactions,
    trackSwaps,
  });

  const autoSign = useCallback(
    async (transactionMeta) => {
      const { TransactionController, KeyringController } = Engine.context;
      const swapsTransactions = props.swapsTransactions;

      try {
        TransactionController.hub.once(
          `${transactionMeta.id}:finished`,
          (transactionMeta) => {
            if (transactionMeta.status === 'submitted') {
              NotificationManager.watchSubmittedTransaction({
                ...transactionMeta,
                assetType: transactionMeta.txParams.assetType,
              });
            } else {
              if (swapsTransactions[transactionMeta.id]?.analytics) {
                trackSwaps(
                  MetaMetricsEvents.SWAP_FAILED,
                  transactionMeta,
                  swapsTransactions,
                );
              }
              throw transactionMeta.error;
            }
          },
        );

        // Queue txMetaId to listen for confirmation event
        addTransactionMetaIdForListening(transactionMeta.id);

        await KeyringController.resetQRKeyringState();

        const isLedgerAccount = isHardwareAccount(
          transactionMeta.txParams.from,
          [ExtendedKeyringTypes.ledger],
        );

        // For Ledger Accounts we handover the signing to the confirmation flow
        if (isLedgerAccount) {
          const deviceId = await getDeviceId();

          props.navigation.navigate(
            ...createLedgerTransactionModalNavDetails({
              transactionId: transactionMeta.id,
              deviceId,
              // eslint-disable-next-line no-empty-function
              onConfirmationComplete: () => {},
              type: 'signTransaction',
            }),
          );
        } else {
          Engine.acceptPendingApproval(transactionMeta.id);
        }
      } catch (error) {
        if (
          !error?.message.startsWith(KEYSTONE_TX_CANCELED) &&
          !error?.message.startsWith(STX_NO_HASH_ERROR)
        ) {
          Alert.alert(
            strings('transactions.transaction_error'),
            error && error.message,
            [{ text: strings('navigation.ok') }],
          );
          Logger.error(error, 'error while trying to send transaction (Main)');
        } else {
          trackEvent(MetaMetricsEvents.QR_HARDWARE_TRANSACTION_CANCELED);
        }
      }
    },
    [
      props.navigation,
      trackSwaps,
      trackEvent,
      props.swapsTransactions,
      addTransactionMetaIdForListening,
    ],
  );

  const onUnapprovedTransaction = useCallback(
    async (transactionMeta) => {
      if (transactionMeta.origin === TransactionTypes.MMM) return;

      const to = transactionMeta.txParams.to?.toLowerCase();
      const { data } = transactionMeta.txParams;

      if (
        getIsSwapApproveOrSwapTransaction(
          data,
          transactionMeta.origin,
          to,
          props.chainId,
        )
      ) {
        autoSign(transactionMeta);
      } else {
        const {
          txParams: { value, gas, gasPrice, data },
        } = transactionMeta;
        const { AssetsContractController } = Engine.context;
        transactionMeta.txParams.gas = hexToBN(gas);
        transactionMeta.txParams.gasPrice = gasPrice && hexToBN(gasPrice);

        if (
          (value === '0x0' || !value) &&
          data &&
          data !== '0x' &&
          to &&
          (await getMethodData(data)).name === TOKEN_METHOD_TRANSFER
        ) {
          let asset = props.tokens.find(({ address }) =>
            toLowerCaseEquals(address, to),
          );
          if (!asset) {
            // try to lookup contract by lowercased address `to`
            asset = tokenList[to];

            if (!asset) {
              try {
                asset = {};
                asset.decimals =
                  await AssetsContractController.getERC20TokenDecimals(to);
                asset.symbol =
                  await AssetsContractController.getERC721AssetSymbol(to);
                // adding `to` here as well
                asset.address = to;
              } catch (e) {
                // This could fail when requesting a transfer in other network
                // adding `to` here as well
                asset = { symbol: 'ERC20', decimals: new BN(0), address: to };
              }
            }
          }

          const tokenData = hstInterface.parseTransaction({ data });
          const tokenValue = getTokenValueParam(tokenData);
          const toAddress = getTokenAddressParam(tokenData);
          const tokenAmount =
            tokenData && calcTokenAmount(tokenValue, asset.decimals).toFixed();

          transactionMeta.txParams.value = hexToBN(
            getTokenValueParamAsHex(tokenData),
          );
          transactionMeta.txParams.readableValue = tokenAmount;
          transactionMeta.txParams.to = toAddress;

          setTransactionObject({
            type: 'INDIVIDUAL_TOKEN_TRANSACTION',
            selectedAsset: asset,
            id: transactionMeta.id,
            origin: transactionMeta.origin,
            securityAlertResponse: transactionMeta.securityAlertResponse,
            ...transactionMeta.txParams,
          });
        } else {
          transactionMeta.txParams.value = hexToBN(value);
          transactionMeta.txParams.readableValue = fromWei(
            transactionMeta.txParams.value,
          );

          setEtherTransaction({
            id: transactionMeta.id,
            origin: transactionMeta.origin,
            securityAlertResponse: transactionMeta.securityAlertResponse,
            ...transactionMeta.txParams,
          });
        }

        if (isApprovalTransaction(data) && (!value || isZeroValue(value))) {
          setTransactionModalType(TransactionModalType.Transaction);
        } else {
          setTransactionModalType(TransactionModalType.Dapp);
        }
      }
    },
    [
      props.chainId,
      props.tokens,
      autoSign,
      setTransactionObject,
      tokenList,
      setEtherTransaction,
    ],
  );

  const onTransactionComplete = useCallback(() => {
    setTransactionModalType(undefined);
  }, []);

  // unapprovedTransaction effect
  useEffect(() => {
    Engine.context.TransactionController.hub.on(
      'unapprovedTransaction',
      onUnapprovedTransaction,
    );
    return () => {
      Engine.context.TransactionController.hub.removeListener(
        'unapprovedTransaction',
        onUnapprovedTransaction,
      );
    };
  }, [onUnapprovedTransaction]);

  useEffect(() => {
    initializeWalletConnect();

    return function cleanup() {
      Engine.context.TokensController.hub.removeAllListeners();
      WalletConnect.hub.removeAllListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <React.Fragment>
      <SignatureApproval />
      <WalletConnectApproval />
      <TransactionApproval
        transactionType={transactionModalType}
        navigation={props.navigation}
        onComplete={onTransactionComplete}
      />
      <AddChainApproval />
      <SwitchChainApproval />
      <WatchAssetApproval />
      <ConnectApproval navigation={props.navigation} />
      <PermissionApproval navigation={props.navigation} />
      <FlowLoaderModal />
      <TemplateConfirmationModal />
      {
        ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      }
      <InstallSnapApproval />
      {
        ///: END:ONLY_INCLUDE_IF
      }
    </React.Fragment>
  );
};

RootRPCMethodsUI.propTypes = {
  swapsTransactions: PropTypes.object,
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
  /**
   * Action that sets an ETH transaction
   */
  setEtherTransaction: PropTypes.func,
  /**
   * Action that sets a transaction
   */
  setTransactionObject: PropTypes.func,
  /**
   * Array of ERC20 assets
   */
  tokens: PropTypes.array,
  /**
   * Selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * Chain id
   */
  chainId: PropTypes.string,
  /**
   * If smart transactions should be used
   */
  shouldUseSmartTransaction: PropTypes.bool,
};

const mapStateToProps = (state) => ({
  selectedAddress: selectSelectedInternalAccountChecksummedAddress(state),
  chainId: selectChainId(state),
  tokens: selectTokens(state),
  swapsTransactions:
    state.engine.backgroundState.TransactionController.swapsTransactions || {},
  providerType: selectProviderType(state),
  shouldUseSmartTransaction: selectShouldUseSmartTransaction(state),
});

const mapDispatchToProps = (dispatch) => ({
  setEtherTransaction: (transaction) =>
    dispatch(setEtherTransaction(transaction)),
  setTransactionObject: (transaction) =>
    dispatch(setTransactionObject(transaction)),
});

export default connect(mapStateToProps, mapDispatchToProps)(RootRPCMethodsUI);
