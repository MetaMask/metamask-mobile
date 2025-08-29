import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { SafeAreaView, Dimensions, Alert } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Share from 'react-native-share';
import QRCode from 'react-native-qrcode-svg';
import { connect } from 'react-redux';

import { MetaMetricsEvents } from '../../../core/Analytics';
import Logger from '../../../util/Logger';
import { strings } from '../../../../locales/i18n';
import { generateUniversalLinkAddress } from '../../../util/payment-link-generator';
import { showAlert } from '../../../actions/alert';
import { protectWalletModalVisible } from '../../../actions/user';

import GlobalAlert from '../GlobalAlert';
import ClipboardManager from '../../../core/ClipboardManager';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { selectChainId } from '../../../selectors/networkController';
import { isNetworkRampSupported } from '../Ramp/Aggregator/utils';
import { createBuyNavigationDetails } from '../Ramp/Aggregator/routes/utils';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { getRampNetworks } from '../../../reducers/fiatOrders';
import { RequestPaymentModalSelectorsIDs } from '../../../../e2e/selectors/Receive/RequestPaymentModal.selectors';
import { withMetricsAwareness } from '../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../util/networks';
import QRAccountDisplay from '../../Views/QRAccountDisplay';
import PNG_MM_LOGO_PATH from '../../../images/branding/fox.png';
import { isEthAddress } from '../../../util/address';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';

const { height: windowHeight } = Dimensions.get('window');

const createStyles = (theme) => ({
  wrapper: {
    backgroundColor: theme.colors.background.default,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginTop: windowHeight * 0.05 + 160,
    marginBottom: 20,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    height: windowHeight * 0.95 - 180,
    width: '100%',
  },
});

/**
 * PureComponent that renders receive options
 */
class ReceiveRequest extends PureComponent {
  static propTypes = {
    /**
     * The navigator object
     */
    navigation: PropTypes.object,
    /**
     * Selected address as string
     */
    selectedAddress: PropTypes.string,
    /**
     * Asset to receive, could be not defined
     */
    receiveAsset: PropTypes.object,
    /**
     /* Triggers global alert
     */
    showAlert: PropTypes.func,
    /**
     * Network provider chain id
     */
    chainId: PropTypes.string,
    /**
     * Prompts protect wallet modal
     */
    protectWalletModalVisible: PropTypes.func,
    /**
     * Hides the modal that contains the component
     */
    hideModal: PropTypes.func,
    /**
     * redux flag that indicates if the user
     * completed the seed phrase backup flow
     */
    seedphraseBackedUp: PropTypes.bool,
    /**
     * Boolean that indicates if the network supports buy
     */
    isNetworkBuySupported: PropTypes.bool,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
    /**
     * Boolean that indicates if the evm network is selected
     */
    isEvmNetworkSelected: PropTypes.bool,
  };

  state = {
    qrModalVisible: false,
    buyModalVisible: false,
  };

  /**
   * Share current account public address
   */
  onShare = () => {
    const { selectedAddress } = this.props;
    Share.open({
      message: generateUniversalLinkAddress(selectedAddress),
    })
      .then(() => {
        this.props.hideModal();
        setTimeout(() => this.props.protectWalletModalVisible(), 1000);
      })
      .catch((err) => {
        Logger.log('Error while trying to share address', err);
      });

    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.RECEIVE_OPTIONS_SHARE_ADDRESS)
        .build(),
    );
  };

  /**
   * Shows an alert message with a coming soon message
   */
  onBuy = async () => {
    const { navigation, isNetworkBuySupported } = this.props;
    if (!isNetworkBuySupported) {
      Alert.alert(
        strings('fiat_on_ramp.network_not_supported'),
        strings('fiat_on_ramp.switch_network'),
      );
    } else {
      navigation.navigate(...createBuyNavigationDetails());

      this.props.metrics.trackEvent(
        this.props.metrics
          .createEventBuilder(MetaMetricsEvents.BUY_BUTTON_CLICKED)
          .addProperties({
            text: 'Buy Native Token',
            location: 'Receive Modal',
            chain_id_destination: getDecimalChainId(this.props.chainId),
          })
          .build(),
      );
    }
  };

  copyAccountToClipboard = async () => {
    const { selectedAddress } = this.props;
    ClipboardManager.setString(selectedAddress);
    this.props.showAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('account_details.account_copied_to_clipboard') },
    });
    if (!this.props.seedphraseBackedUp) {
      setTimeout(() => this.props.hideModal(), 1000);
      setTimeout(() => this.props.protectWalletModalVisible(), 1500);
    }
  };

  onReceive = () => {
    this.props.navigation.navigate('PaymentRequestView', {
      screen: 'PaymentRequest',
      params: { receiveAsset: this.props.receiveAsset },
    });

    this.props.metrics.trackEvent(
      this.props.metrics
        .createEventBuilder(MetaMetricsEvents.RECEIVE_OPTIONS_PAYMENT_REQUEST)
        .build(),
    );
  };

  render() {
    const theme = this.context || mockTheme;
    const styles = createStyles(theme);

    const qrValue = isEthAddress(this.props.selectedAddress)
      ? `ethereum:${this.props.selectedAddress}@${this.props.chainId}`
      : this.props.selectedAddress;

    return (
      <SafeAreaView style={styles.wrapper}>
        <Box twClassName="flex-1">
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            twClassName="px-4 py-6"
          >
            <Box twClassName="p-6 border border-muted rounded-2xl">
              <QRCode
                logo={PNG_MM_LOGO_PATH}
                logoSize={32}
                logoBorderRadius={8}
                value={qrValue}
                size={200}
              />
            </Box>

            <Box twClassName="mt-6 mb-4">
              <QRAccountDisplay accountAddress={this.props.selectedAddress} />
            </Box>
          </Box>
        </Box>

        {this.props.isEvmNetworkSelected && (
          <Box twClassName="px-4 pb-4">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={this.onReceive}
              testID={RequestPaymentModalSelectorsIDs.REQUEST_BUTTON}
            >
              {strings('receive_request.request_payment')}
            </Button>
          </Box>
        )}

        <GlobalAlert />
      </SafeAreaView>
    );
  }
}

ReceiveRequest.contextType = ThemeContext;

const mapStateToProps = (state) => ({
  chainId: selectChainId(state),
  selectedAddress: selectSelectedInternalAccountFormattedAddress(state),
  receiveAsset: state.modals.receiveAsset,
  seedphraseBackedUp: state.user.seedphraseBackedUp,
  isNetworkBuySupported: isNetworkRampSupported(
    selectChainId(state),
    getRampNetworks(state),
  ),
  isEvmNetworkSelected: selectIsEvmNetworkSelected(state),
});

const mapDispatchToProps = (dispatch) => ({
  showAlert: (config) => dispatch(showAlert(config)),
  protectWalletModalVisible: () => dispatch(protectWalletModalVisible()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(withMetricsAwareness(ReceiveRequest));
