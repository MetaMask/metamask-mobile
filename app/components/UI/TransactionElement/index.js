import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  TouchableOpacity,
  TouchableHighlight,
  StyleSheet,
  Image,
  Text,
  View,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import { toDateFormat } from '../../../util/date';
import TransactionDetails from './TransactionDetails';
import { safeToChecksumAddress } from '../../../util/address';
import { connect } from 'react-redux';
import StyledButton from '../StyledButton';
import Modal from 'react-native-modal';
import decodeTransaction from './utils';
import { TRANSACTION_TYPES } from '../../../util/transactions';
import ListItem from '../../Base/ListItem';
import StatusText from '../../Base/StatusText';
import DetailsModal from '../../Base/DetailsModal';
import { isTestNet, isPerDappSelectedNetworkEnabled } from '../../../util/networks';
import { weiHexToGweiDec } from '@metamask/controller-utils';
import {
  WalletDevice,
  isEIP1559Transaction,
} from '@metamask/transaction-controller';
import { ThemeContext, mockTheme } from '../../../util/theme';
import {
  selectTickerByChainId,
  selectEvmNetworkConfigurationsByChainId,
} from '../../../selectors/networkController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { selectPrimaryCurrency } from '../../../selectors/settings';
import { selectSwapsTransactions } from '../../../selectors/transactionController';
import { swapsControllerTokens } from '../../../reducers/swaps';
import {
  FINAL_NON_CONFIRMED_STATUSES,
  useBridgeTxHistoryData,
} from '../../../util/bridge/hooks/useBridgeTxHistoryData';
import BridgeActivityItemTxSegments from '../Bridge/components/TransactionDetails/BridgeActivityItemTxSegments';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../constants/bridge';
import { decimalToHex } from '../../../util/conversions';
import { addHexPrefix } from '../../../util/number';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../AssetOverview/Balance/Balance';
import Routes from '../../../constants/navigation/Routes';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { getBridgeTxActivityTitle } from '../Bridge/utils/transaction-history';

const createStyles = (colors, typography) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    actionContainerStyle: {
      height: 25,
      padding: 0,
    },
    speedupActionContainerStyle: {
      marginRight: 10,
    },
    actionStyle: {
      fontSize: 10,
      padding: 0,
      paddingHorizontal: 10,
    },
    icon: {
      width: 32,
      height: 32,
    },
    summaryWrapper: {
      padding: 15,
    },
    fromDeviceText: {
      color: colors.text.alternative,
      fontSize: 14,
      marginBottom: 10,
      ...fontStyles.normal,
    },
    importText: {
      color: colors.text.alternative,
      fontSize: 14,
      ...fontStyles.bold,
      alignContent: 'center',
    },
    importRowBody: {
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      paddingTop: 10,
    },
    listItemDate: {
      marginBottom: 0,
      paddingBottom: 0,
    },
    listItemContent: {
      alignItems: 'flex-start',
      marginTop: 0,
      paddingTop: 0,
    },
    listItemTitle: {
      ...typography.sBodyLGMedium,
      fontFamily: getFontFamily(TextVariant.BodyLGMedium),
      marginTop: 0,
    },
    listItemStatus: {
      ...typography.sBodyMDBold,
      fontFamily: getFontFamily(TextVariant.BodyMDBold),
    },
    listItemFiatAmount: {
      ...typography.sBodyLGMedium,
      fontFamily: getFontFamily(TextVariant.BodyLGMedium),
      marginTop: 0,
    },
    listItemAmount: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      color: colors.text.alternative,
    },
  });

/* eslint-disable import/no-commonjs */
const transactionIconApprove = require('../../../images/transaction-icons/approve.png');
const transactionIconInteraction = require('../../../images/transaction-icons/interaction.png');
const transactionIconSent = require('../../../images/transaction-icons/send.png');
const transactionIconReceived = require('../../../images/transaction-icons/receive.png');
const transactionIconSwap = require('../../../images/transaction-icons/swap.png');

const transactionIconApproveFailed = require('../../../images/transaction-icons/approve-failed.png');
const transactionIconInteractionFailed = require('../../../images/transaction-icons/interaction-failed.png');
const transactionIconSentFailed = require('../../../images/transaction-icons/send-failed.png');
const transactionIconReceivedFailed = require('../../../images/transaction-icons/receive-failed.png');
const transactionIconSwapFailed = require('../../../images/transaction-icons/swap-failed.png');
/* eslint-enable import/no-commonjs */

/**
 * View that renders a transaction item part of transactions list
 */
class TransactionElement extends PureComponent {
  static propTypes = {
    assetSymbol: PropTypes.string,
    /**
     * Asset object (in this case ERC721 token)
     */
    tx: PropTypes.object,
    /**
    /* InternalAccount object required to get import time name
    */
    selectedInternalAccount: PropTypes.object,
    /**
     * Current element of the list index
     */
    i: PropTypes.number,
    /**
     * Callback to render transaction details view
     */
    onPressItem: PropTypes.func,
    /**
     * Callback to speed up tx
     */
    onSpeedUpAction: PropTypes.func,
    /**
     * Callback to cancel tx
     */
    onCancelAction: PropTypes.func,
    swapsTransactions: PropTypes.object,
    swapsTokens: PropTypes.arrayOf(PropTypes.object),
    signQRTransaction: PropTypes.func,
    cancelUnsignedQRTransaction: PropTypes.func,
    isQRHardwareAccount: PropTypes.bool,
    isLedgerAccount: PropTypes.bool,
    signLedgerTransaction: PropTypes.func,
    bridgeTxHistoryData: PropTypes.object,
    /**
     * Chain Id
     */
    txChainId: PropTypes.string,
     /**
     * Network configurations by chain id
     */
     // adding a disable rule since this prop is part of a prop spread <TransactionElement {...props} but ts lint cant see that
     // eslint-disable-next-line react/no-unused-prop-types
     networkConfigurationsByChainId: PropTypes.object,
    /**
     * Navigation object for routing
     */
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
  };

  state = {
    actionKey: undefined,
    cancelIsOpen: false,
    speedUpIsOpen: false,
    detailsModalVisible: false,
    importModalVisible: false,
    transactionGas: {
      gasBN: undefined,
      gasPriceBN: undefined,
      gasTotal: undefined,
    },
    transactionElement: undefined,
    transactionDetails: undefined,
  };

  mounted = false;

  componentDidMount = async () => {
    const [transactionElement, transactionDetails] = await decodeTransaction({
      ...this.props,
      swapsTransactions: this.props.swapsTransactions,
      swapsTokens: this.props.swapsTokens,
      assetSymbol: this.props.assetSymbol,
      txChainId: this.props.txChainId,
    });
    this.mounted = true;

    this.mounted && this.setState({ transactionElement, transactionDetails });
  };

  componentDidUpdate(prevProps) {
    if (
      prevProps.txChainId !== this.props.txChainId ||
      prevProps.swapsTransactions !== this.props.swapsTransactions ||
      prevProps.swapsTokens !== this.props.swapsTokens
    ) {
      this.componentDidMount();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  onPressItem = () => {
    const { tx, i, onPressItem } = this.props;
    onPressItem(tx.id, i);
    if (tx.type === 'bridge') {
      this.props.navigation.navigate(Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS, {
        evmTxMeta: tx,
      });
    } else {
      this.setState({ detailsModalVisible: true });
    }
  };

  onPressImportWalletTip = () => {
    this.setState({ importModalVisible: true });
  };

  onCloseImportWalletModal = () => {
    this.setState({ importModalVisible: false });
  };

  onCloseDetailsModal = () => {
    this.setState({ detailsModalVisible: false });
  };

  renderTxTime = () => {
    const { tx, selectedInternalAccount } = this.props;
    const selectedAddress = safeToChecksumAddress(
      selectedInternalAccount?.address,
    );
    const incoming = safeToChecksumAddress(tx.txParams.to) === selectedAddress;
    const selfSent =
      incoming && safeToChecksumAddress(tx.txParams.from) === selectedAddress;
    return `${
      (!incoming || selfSent) && tx.deviceConfirmedOn === WalletDevice.MM_MOBILE
        ? `#${parseInt(tx.txParams.nonce, 16)} - ${toDateFormat(
            tx.time,
          )} ${strings(
            'transactions.from_device_label',
            // eslint-disable-next-line no-mixed-spaces-and-tabs
          )}`
        : `${toDateFormat(tx.time)}
      `
    }`;
  };

  /**
   * Function that evaluates tx to see if the Added Wallet label should be rendered.
   * @returns Account added to wallet view
   */
  renderImportTime = () => {
    const { tx, selectedInternalAccount } = this.props;
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);
    const accountImportTime = selectedInternalAccount?.metadata.importTime;
    if (tx.insertImportTime && accountImportTime) {
      return (
        <>
          <TouchableOpacity
            onPress={this.onPressImportWalletTip}
            style={styles.importRowBody}
          >
            <Text style={styles.importText}>
              {`${strings('transactions.import_wallet_row')} `}
              <FAIcon name="info-circle" style={styles.infoIcon} />
            </Text>
            <ListItem.Date>{toDateFormat(accountImportTime)}</ListItem.Date>
          </TouchableOpacity>
        </>
      );
    }
    return null;
  };

  renderTxElementIcon = (transactionElement, status, chainId) => {
    const { transactionType } = transactionElement;
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);

    const isFailedTransaction = status === 'cancelled' || status === 'failed';
    let icon;
    switch (transactionType) {
      case TRANSACTION_TYPES.SENT_TOKEN:
      case TRANSACTION_TYPES.SENT_COLLECTIBLE:
      case TRANSACTION_TYPES.SENT:
        icon = isFailedTransaction
          ? transactionIconSentFailed
          : transactionIconSent;
        break;
      case TRANSACTION_TYPES.RECEIVED_TOKEN:
      case TRANSACTION_TYPES.RECEIVED_COLLECTIBLE:
      case TRANSACTION_TYPES.RECEIVED:
        icon = isFailedTransaction
          ? transactionIconReceivedFailed
          : transactionIconReceived;
        break;
      case TRANSACTION_TYPES.SITE_INTERACTION:
        icon = isFailedTransaction
          ? transactionIconInteractionFailed
          : transactionIconInteraction;
        break;
      case TRANSACTION_TYPES.SWAPS_TRANSACTION:
        icon = isFailedTransaction
          ? transactionIconSwapFailed
          : transactionIconSwap;
        break;
      case TRANSACTION_TYPES.BRIDGE_TRANSACTION:
        icon = isFailedTransaction
          ? transactionIconSwapFailed
          : transactionIconSwap;
        break;
      case TRANSACTION_TYPES.APPROVE:
      case TRANSACTION_TYPES.INCREASE_ALLOWANCE:
      case TRANSACTION_TYPES.SET_APPROVAL_FOR_ALL:
        icon = isFailedTransaction
          ? transactionIconApproveFailed
          : transactionIconApprove;
        break;
    }
    return (
      <BadgeWrapper
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={NetworkBadgeSource(chainId)}
          />
        }
      >
        <Image source={icon} style={styles.icon} resizeMode="stretch" />
      </BadgeWrapper>
    );
  };

  /**
   * Renders an horizontal bar with basic tx information
   *
   * @param {object} transactionElement - Transaction information to render, containing addressTo, actionKey, value, fiatValue, contractDeployment
   */
  renderTxElement = (transactionElement) => {
    const {
      selectedInternalAccount,
      isQRHardwareAccount,
      isLedgerAccount,
      i,
      tx: { time, status, isSmartTransaction, chainId, type },
      bridgeTxHistoryData: { bridgeTxHistoryItem, isBridgeComplete },
    } = this.props;
    const isBridgeTransaction = type === 'bridge';
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);
    const { value, fiatValue = false, actionKey } = transactionElement;
    const renderNormalActions =
      (status === 'submitted' ||
        (status === 'approved' && !isQRHardwareAccount && !isLedgerAccount)) &&
      !isSmartTransaction &&
      !isBridgeTransaction;
    const renderUnsignedQRActions =
      status === 'approved' && isQRHardwareAccount;
    const renderLedgerActions = status === 'approved' && isLedgerAccount;
    const accountImportTime = selectedInternalAccount?.metadata.importTime;
    let title = actionKey;
    if (isBridgeTransaction && bridgeTxHistoryItem) {
      title = getBridgeTxActivityTitle(bridgeTxHistoryItem) ?? title;
    }
    return (
      <>
        {accountImportTime > time && this.renderImportTime()}
        <ListItem>
          <ListItem.Date style={styles.listItemDate}>
            {this.renderTxTime()}
          </ListItem.Date>
          <ListItem.Content style={styles.listItemContent}>
            <ListItem.Icon>
              {this.renderTxElementIcon(transactionElement, status, chainId)}
            </ListItem.Icon>
            <ListItem.Body>
              <ListItem.Title numberOfLines={1} style={styles.listItemTitle}>
                {title}
              </ListItem.Title>
              {!FINAL_NON_CONFIRMED_STATUSES.includes(status) &&
              isBridgeTransaction &&
              !isBridgeComplete ? (
                <BridgeActivityItemTxSegments
                  bridgeTxHistoryItem={bridgeTxHistoryItem}
                  transactionStatus={this.props.tx.status}
                />
              ) : (
                <StatusText
                  testID={`transaction-status-${i}`}
                  status={status}
                  style={styles.listItemStatus}
                />
              )}
            </ListItem.Body>
            {Boolean(value) && (
              <ListItem.Amounts>
                {!isTestNet(chainId) && (
                  <ListItem.FiatAmount style={styles.listItemFiatAmount}>
                    {fiatValue}
                  </ListItem.FiatAmount>
                )}
                <ListItem.Amount style={styles.listItemAmount}>
                  {value}
                </ListItem.Amount>
              </ListItem.Amounts>
            )}
          </ListItem.Content>
          {renderNormalActions && (
            <ListItem.Actions>
              {this.renderSpeedUpButton()}
              {this.renderCancelButton()}
            </ListItem.Actions>
          )}
          {renderUnsignedQRActions && (
            <ListItem.Actions>
              {this.renderQRSignButton()}
              {this.renderCancelUnsignedButton()}
            </ListItem.Actions>
          )}
          {renderLedgerActions && (
            <ListItem.Actions>{this.renderLedgerSignButton()}</ListItem.Actions>
          )}
        </ListItem>
        {accountImportTime <= time && this.renderImportTime()}
      </>
    );
  };

  renderCancelButton = () => {
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);

    return (
      <StyledButton
        type={'cancel'}
        containerStyle={styles.actionContainerStyle}
        style={styles.actionStyle}
        onPress={this.showCancelModal}
      >
        {strings('transaction.cancel')}
      </StyledButton>
    );
  };

  parseGas = () => {
    const { tx } = this.props;

    let existingGas = {};
    const transaction = tx?.txParams;
    if (transaction) {
      if (isEIP1559Transaction(transaction)) {
        existingGas = {
          isEIP1559Transaction: true,
          maxFeePerGas: weiHexToGweiDec(transaction.maxFeePerGas),
          maxPriorityFeePerGas: weiHexToGweiDec(
            transaction.maxPriorityFeePerGas,
          ),
        };
      } else {
        const existingGasPrice = tx.txParams ? tx.txParams.gasPrice : '0x0';
        const existingGasPriceDecimal = parseInt(
          existingGasPrice === undefined ? '0x0' : existingGasPrice,
          16,
        );
        existingGas = { gasPrice: existingGasPriceDecimal };
      }
    }
    return existingGas;
  };

  showCancelModal = () => {
    const existingGas = this.parseGas();

    this.mounted && this.props.onCancelAction(true, existingGas, this.props.tx);
  };

  showSpeedUpModal = () => {
    const existingGas = this.parseGas();

    this.mounted &&
      this.props.onSpeedUpAction(true, existingGas, this.props.tx);
  };

  hideSpeedUpModal = () => {
    this.mounted && this.props.onSpeedUpAction(false);
  };

  showQRSigningModal = () => {
    this.mounted && this.props.signQRTransaction(this.props.tx);
  };

  showLedgerSigninModal = () => {
    this.mounted && this.props.signLedgerTransaction(this.props.tx);
  };

  cancelUnsignedQRTransaction = () => {
    this.mounted && this.props.cancelUnsignedQRTransaction(this.props.tx);
  };

  renderSpeedUpButton = () => {
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);

    return (
      <StyledButton
        type={'normal'}
        containerStyle={[
          styles.actionContainerStyle,
          styles.speedupActionContainerStyle,
        ]}
        style={styles.actionStyle}
        onPress={this.showSpeedUpModal}
      >
        {strings('transaction.speedup')}
      </StyledButton>
    );
  };

  renderQRSignButton = () => {
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);
    return (
      <StyledButton
        type={'normal'}
        containerStyle={[
          styles.actionContainerStyle,
          styles.speedupActionContainerStyle,
        ]}
        style={styles.actionStyle}
        onPress={this.showQRSigningModal}
      >
        {strings('transaction.sign_with_keystone')}
      </StyledButton>
    );
  };

  renderLedgerSignButton = () => {
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);
    return (
      <StyledButton
        type={'normal'}
        containerStyle={[
          styles.actionContainerStyle,
          styles.speedupActionContainerStyle,
        ]}
        style={styles.actionStyle}
        onPress={this.showLedgerSigninModal}
      >
        {strings('transaction.sign_with_ledger')}
      </StyledButton>
    );
  };

  renderCancelUnsignedButton = () => {
    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);
    return (
      <StyledButton
        type={'cancel'}
        containerStyle={[
          styles.actionContainerStyle,
          styles.speedupActionContainerStyle,
        ]}
        style={styles.actionStyle}
        onPress={this.cancelUnsignedQRTransaction}
      >
        {strings('transaction.cancel')}
      </StyledButton>
    );
  };

  render() {
    const { tx } = this.props;
    const {
      detailsModalVisible,
      importModalVisible,
      transactionElement,
      transactionDetails,
    } = this.state;

    const { colors, typography } = this.context || mockTheme;
    const styles = createStyles(colors, typography);

    if (!transactionElement || !transactionDetails) return null;
    return (
      <>
        <TouchableHighlight
          style={styles.row}
          onPress={this.onPressItem}
          underlayColor={colors.background.alternative}
          activeOpacity={1}
        >
          {this.renderTxElement(transactionElement)}
        </TouchableHighlight>
        {detailsModalVisible && (
          <Modal
            isVisible={detailsModalVisible}
            onBackdropPress={this.onCloseDetailsModal}
            onBackButtonPress={this.onCloseDetailsModal}
            onSwipeComplete={this.onCloseDetailsModal}
            swipeDirection={'down'}
            backdropColor={colors.overlay.default}
            backdropOpacity={1}
          >
            <DetailsModal>
              <DetailsModal.Header>
                <DetailsModal.Title onPress={this.onCloseDetailsModal}>
                  {transactionElement?.actionKey}
                </DetailsModal.Title>
                <DetailsModal.CloseIcon onPress={this.onCloseDetailsModal} />
              </DetailsModal.Header>
              <TransactionDetails
                transactionObject={tx}
                transactionDetails={transactionDetails}
                showSpeedUpModal={this.showSpeedUpModal}
                showCancelModal={this.showCancelModal}
                close={this.onCloseDetailsModal}
              />
            </DetailsModal>
          </Modal>
        )}
        <Modal
          isVisible={importModalVisible}
          onBackdropPress={this.onCloseImportWalletModal}
          onBackButtonPress={this.onCloseImportWalletModal}
          onSwipeComplete={this.onCloseImportWalletModal}
          swipeDirection={'down'}
          backdropColor={colors.overlay.default}
          backdropOpacity={1}
        >
          <DetailsModal>
            <DetailsModal.Header>
              <DetailsModal.Title onPress={this.onCloseImportWalletModal}>
                {strings('transactions.import_wallet_label')}
              </DetailsModal.Title>
              <DetailsModal.CloseIcon onPress={this.onCloseImportWalletModal} />
            </DetailsModal.Header>
            <View style={styles.summaryWrapper}>
              <Text style={styles.fromDeviceText}>
                {strings('transactions.import_wallet_tip')}
              </Text>
            </View>
          </DetailsModal>
        </Modal>
      </>
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  networkConfigurationsByChainId: isPerDappSelectedNetworkEnabled() ? undefined : selectEvmNetworkConfigurationsByChainId(state),
  selectedInternalAccount: selectSelectedInternalAccount(state),
  primaryCurrency: selectPrimaryCurrency(state),
  swapsTransactions: selectSwapsTransactions(state),
  swapsTokens: swapsControllerTokens(state),
  ticker: isPerDappSelectedNetworkEnabled() ? selectTickerByChainId(state, ownProps.tx.chainId) : undefined,
});

TransactionElement.contextType = ThemeContext;

// Create a wrapper functional component
const TransactionElementWithBridge = (props) => {
  const bridgeTxHistoryData = useBridgeTxHistoryData({ evmTxMeta: props.tx });

  return (
    <TransactionElement {...props} bridgeTxHistoryData={bridgeTxHistoryData} />
  );
};

TransactionElementWithBridge.propTypes = {
  tx: PropTypes.object.isRequired,
};

export default connect(mapStateToProps)(TransactionElementWithBridge);
