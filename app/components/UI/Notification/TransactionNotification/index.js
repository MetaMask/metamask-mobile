import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated from 'react-native-reanimated';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { renderFromWei, fastSplit } from '../../../../util/number';
import { validateTransactionActionBalance } from '../../../../util/transactions';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../styles/common';
import decodeTransaction from '../../TransactionElement/utils';
import TransactionActionContent from '../../TransactionActionModal/TransactionActionContent';
import ActionContent from '../../ActionModal/ActionContent';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TransactionDetails from '../../TransactionElement/TransactionDetails';
import BaseNotification from './../BaseNotification';
import Device from '../../../../util/device';
import ElevatedView from 'react-native-elevated-view';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/transaction-controller';
import BigNumber from 'bignumber.js';
import { collectibleContractsSelector } from '../../../../reducers/collectibles';
import { useTheme } from '../../../../util/theme';

const WINDOW_WIDTH = Dimensions.get('window').width;
const ACTION_CANCEL = 'cancel';
const ACTION_SPEEDUP = 'speedup';

const createStyles = (colors) =>
  StyleSheet.create({
    absoluteFill: {
      ...StyleSheet.absoluteFillObject,
    },
    titleWrapper: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border.default,
      flexDirection: 'row',
    },
    title: {
      flex: 1,
      textAlign: 'center',
      fontSize: 18,
      marginVertical: 12,
      marginHorizontal: 24,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    notification: {
      position: 'absolute',
      bottom: 0,
      paddingBottom: Device.isIphoneX() ? 20 : 10,
      left: 0,
      right: 0,
      backgroundColor: importedColors.transparent,
    },
    modalTypeViewBrowser: {
      bottom: Device.isIphoneX() ? 70 : 60,
    },
    closeIcon: {
      paddingTop: 4,
      position: 'absolute',
      right: 16,
      color: colors.icon.default,
    },
    modalsContainer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '200%',
      flexDirection: 'row',
      backgroundColor: colors.overlay.default,
    },
    modalOverlay: {
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
    modalContainer: {
      width: '90%',
      borderRadius: 10,
      backgroundColor: colors.background.default,
    },
    elevatedView: {
      backgroundColor: importedColors.transparent,
    },
  });

function TransactionNotification(props) {
  const {
    accounts,
    currentNotification,
    isInBrowserView,
    notificationAnimated,
    onClose,
    transactions,
    animatedTimingStart,
  } = props;

  const [transactionDetails, setTransactionDetails] = useState(undefined);
  const [transactionElement, setTransactionElement] = useState(undefined);
  const [tx, setTx] = useState({});
  const [transactionDetailsIsVisible, setTransactionDetailsIsVisible] =
    useState(false);
  const [transactionAction, setTransactionAction] = useState(undefined);
  const [transactionActionDisabled, setTransactionActionDisabled] =
    useState(false);
  const [gasFee, setGasFee] = useState('0x0');

  const detailsYAnimated = useRef(new Animated.Value(0)).current;
  const actionXAnimated = useRef(new Animated.Value(0)).current;
  const detailsAnimated = useRef(new Animated.Value(0)).current;

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const detailsFadeIn = useCallback(async () => {
    setTransactionDetailsIsVisible(true);
    setTimeout(() => animatedTimingStart(detailsAnimated, 1), 500);
  }, [setTransactionDetailsIsVisible, animatedTimingStart, detailsAnimated]);

  const animateActionTo = useCallback(
    (position) => {
      animatedTimingStart(detailsYAnimated, position);
      animatedTimingStart(actionXAnimated, position);
    },
    [animatedTimingStart, actionXAnimated, detailsYAnimated],
  );

  const onCloseDetails = useCallback(() => {
    animatedTimingStart(detailsAnimated, 0);
    setTimeout(() => setTransactionDetailsIsVisible(false), 1000);
  }, [animatedTimingStart, setTransactionDetailsIsVisible, detailsAnimated]);

  const onCloseNotification = useCallback(() => {
    onCloseDetails();
    setTimeout(() => onClose(), 1000);
  }, [onCloseDetails, onClose]);

  const onSpeedUpPress = useCallback(() => {
    const transactionActionDisabled = validateTransactionActionBalance(
      tx,
      SPEED_UP_RATE,
      accounts,
    );
    setTransactionAction(ACTION_SPEEDUP);
    setTransactionActionDisabled(transactionActionDisabled);
    animateActionTo(-WINDOW_WIDTH);
  }, [
    setTransactionAction,
    setTransactionActionDisabled,
    animateActionTo,
    tx,
    accounts,
  ]);

  const onCancelPress = useCallback(() => {
    const transactionActionDisabled = validateTransactionActionBalance(
      tx,
      CANCEL_RATE,
      accounts,
    );
    setTransactionAction(ACTION_CANCEL);
    setTransactionActionDisabled(transactionActionDisabled);
    animateActionTo(-WINDOW_WIDTH);
  }, [
    setTransactionAction,
    setTransactionActionDisabled,
    animateActionTo,
    tx,
    accounts,
  ]);

  const onActionFinish = useCallback(
    () => animateActionTo(0),
    [animateActionTo],
  );

  const safelyExecute = useCallback(
    (callback) => {
      try {
        callback();
      } catch (e) {
        // ignore because transaction already went through
      }
      onActionFinish();
    },
    [onActionFinish],
  );

  const speedUpTransaction = useCallback(() => {
    safelyExecute(() =>
      Engine.context.TransactionController.speedUpTransaction(tx?.id),
    );
  }, [safelyExecute, tx]);

  const stopTransaction = useCallback(() => {
    safelyExecute(() =>
      Engine.context.TransactionController.stopTransaction(tx?.id),
    );
  }, [safelyExecute, tx]);

  useEffect(() => {
    async function getTransactionInfo() {
      const tx = transactions.find(
        ({ id }) => id === currentNotification.transaction.id,
      );
      if (!tx) return;
      const {
        selectedAddress,
        ticker,
        chainId,
        conversionRate,
        currentCurrency,
        exchangeRate,
        contractExchangeRates,
        collectibleContracts,
        tokens,
        primaryCurrency,
        swapsTransactions,
        swapsTokens,
      } = props;
      const [transactionElement, transactionDetails] = await decodeTransaction({
        ...props,
        tx,
        selectedAddress,
        ticker,
        chainId,
        conversionRate,
        currentCurrency,
        exchangeRate,
        contractExchangeRates,
        collectibleContracts,
        tokens,
        primaryCurrency,
        swapsTransactions,
        swapsTokens,
      });
      const existingGasPrice = new BigNumber(
        tx?.transaction?.gasPrice || '0x0',
      );
      const gasFeeValue = fastSplit(
        existingGasPrice
          .times(
            transactionAction === ACTION_CANCEL ? CANCEL_RATE : SPEED_UP_RATE,
          )
          .toString(),
      ); // strips decimals if any, coming from the 'times' operation
      setGasFee(gasFeeValue);
      setTx(tx);
      setTransactionElement(transactionElement);
      setTransactionDetails(transactionDetails);
    }
    getTransactionInfo();
  }, [
    transactions,
    currentNotification.transaction.id,
    transactionAction,
    props,
  ]);

  useEffect(() => onCloseNotification(), [onCloseNotification]);

  return (
    <>
      <Animated.View
        style={[
          styles.notification,
          isInBrowserView && styles.modalTypeViewBrowser,
          {
            transform: [{ translateY: notificationAnimated }],
          },
        ]}
      >
        <ElevatedView style={styles.elevatedView} elevation={100}>
          <BaseNotification
            status={currentNotification.status}
            data={{
              ...tx?.transaction,
              ...currentNotification.transaction,
              title: transactionElement?.notificationKey,
            }}
            onPress={detailsFadeIn}
            onHide={onCloseNotification}
          />
        </ElevatedView>
      </Animated.View>
      {transactionDetailsIsVisible && (
        <View style={styles.modalsContainer}>
          <Animated.View
            style={[
              styles.modalOverlay,
              { opacity: detailsAnimated },
              { transform: [{ translateX: detailsYAnimated }] },
            ]}
          >
            <View style={styles.modalContainer}>
              <View style={styles.titleWrapper}>
                <Text style={styles.title} onPress={onCloseDetails}>
                  {transactionElement?.actionKey}
                </Text>
                <Ionicons
                  onPress={onCloseDetails}
                  name={'ios-close'}
                  size={38}
                  style={styles.closeIcon}
                />
              </View>
              <TransactionDetails
                transactionObject={tx}
                transactionDetails={transactionDetails}
                close={onCloseDetails}
                showSpeedUpModal={onSpeedUpPress}
                showCancelModal={onCancelPress}
              />
            </View>
          </Animated.View>
          <Animated.View
            style={[
              styles.modalOverlay,
              { opacity: detailsAnimated },
              { transform: [{ translateX: actionXAnimated }] },
            ]}
          >
            <View style={styles.modalContainer}>
              <ActionContent
                onCancelPress={onActionFinish}
                onConfirmPress={
                  transactionAction === ACTION_CANCEL
                    ? stopTransaction
                    : speedUpTransaction
                }
                confirmText={strings('transaction.lets_try')}
                confirmButtonMode={'confirm'}
                cancelText={strings('transaction.nevermind')}
                confirmDisabled={transactionActionDisabled}
              >
                <TransactionActionContent
                  confirmDisabled={transactionActionDisabled}
                  feeText={`${renderFromWei(gasFee)} ${strings('unit.eth')}`}
                  titleText={strings(
                    `transaction.${transactionAction}_tx_title`,
                  )}
                  gasTitleText={strings(
                    `transaction.gas_${transactionAction}_fee`,
                  )}
                  descriptionText={strings(
                    `transaction.${transactionAction}_tx_message`,
                  )}
                />
              </ActionContent>
            </View>
          </Animated.View>
        </View>
      )}
    </>
  );
}

TransactionNotification.propTypes = {
  isInBrowserView: PropTypes.bool,
  notificationAnimated: PropTypes.object,
  onClose: PropTypes.func,
  animatedTimingStart: PropTypes.func,
  currentNotification: PropTypes.object,
  swapsTransactions: PropTypes.object,
  swapsTokens: PropTypes.array,
  /**
   * Map of accounts to information objects including balances
   */
  accounts: PropTypes.object,
  /**
   * An array that represents the user transactions on chain
   */
  transactions: PropTypes.array,

  /**
   * String of selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * Current provider ticker
   */
  ticker: PropTypes.string,
  /**
   * Current provider chainId
   */
  chainId: PropTypes.string,
  /**
   * ETH to current currency conversion rate
   */
  conversionRate: PropTypes.number,
  /**
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * Current exchange rate
   */
  exchangeRate: PropTypes.number,
  /**
   * Object containing token exchange rates in the format address => exchangeRate
   */
  contractExchangeRates: PropTypes.object,
  /**
   * An array that represents the user collectible contracts
   */
  collectibleContracts: PropTypes.array,
  /**
   * An array that represents the user tokens
   */
  tokens: PropTypes.object,

  /**
   * Primary currency, either ETH or Fiat
   */
  primaryCurrency: PropTypes.string,
};

const mapStateToProps = (state) => ({
  accounts: state.engine.backgroundState.AccountTrackerController.accounts,
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  transactions: state.engine.backgroundState.TransactionController.transactions,
  ticker: state.engine.backgroundState.NetworkController.provider.ticker,
  chainId: state.engine.backgroundState.NetworkController.provider.chainId,
  tokens: state.engine.backgroundState.TokensController.tokens.reduce(
    (tokens, token) => {
      tokens[token.address] = token;
      return tokens;
    },
    {},
  ),
  collectibleContracts: collectibleContractsSelector(state),
  contractExchangeRates:
    state.engine.backgroundState.TokenRatesController.contractExchangeRates,
  conversionRate:
    state.engine.backgroundState.CurrencyRateController.conversionRate,
  currentCurrency:
    state.engine.backgroundState.CurrencyRateController.currentCurrency,
  primaryCurrency: state.settings.primaryCurrency,
  swapsTransactions:
    state.engine.backgroundState.TransactionController.swapsTransactions || {},
  swapsTokens: state.engine.backgroundState.SwapsController.tokens,
});

export default connect(mapStateToProps)(TransactionNotification);
