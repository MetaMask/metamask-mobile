import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { connect } from 'react-redux';
import { SigningModalSelectorsIDs } from '../../../../../../e2e/selectors/Modals/SigningModal.selectors';
import { strings } from '../../../../../../locales/i18n';
import { withMetricsAwareness } from '../../../../../components/hooks/useMetrics';
import ExtendedKeyringTypes from '../../../../../constants/keyringTypes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../../selectors/accountsController';
import { selectProviderType } from '../../../../../selectors/networkController';
import { fontStyles } from '../../../../../styles/common';
import { isHardwareAccount } from '../../../../../util/address';
import { getAnalyticsParams } from '../../../../../util/confirmation/signatureUtils';
import Device from '../../../../../util/device';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import AccountInfoCard from '../../../../UI/AccountInfoCard';
import ActionView, { ConfirmButtonState } from '../../../../UI/ActionView';
import QRSigningDetails from '../../../../UI/QRHardware/QRSigningDetails';
import withQRHardwareAwareness from '../../../../UI/QRHardware/withQRHardwareAwareness';
import WebsiteIcon from '../../../../UI/WebsiteIcon';
import WarningMessage from '../../SendFlow/WarningMessage';
import BlockaidBanner from '../BlockaidBanner/BlockaidBanner';
import { ResultType } from '../BlockaidBanner/BlockaidBanner.types';

const getCleanUrl = (url) => {
  try {
    const urlObject = new URL(url);

    return urlObject.origin;
  } catch (error) {
    return '';
  }
};

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      minHeight: '90%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    expandedHeight2: {
      minHeight: '90%',
    },
    expandedHeight1: {
      minHeight: '90%',
    },
    signingInformation: {
      alignItems: 'center',
      marginVertical: 24,
    },
    domainLogo: {
      width: 40,
      height: 40,
      marginRight: 8,
      borderRadius: 20,
    },
    messageColumn: {
      width: '75%',
      justifyContent: 'space-between',
    },
    warningLink: {
      ...fontStyles.normal,
      color: colors.primary.default,
      textAlign: 'center',
      paddingHorizontal: 10,
      paddingBottom: 10,
      textDecorationLine: 'underline',
    },
    signText: {
      ...fontStyles.bold,
      fontSize: 20,
      textAlign: 'center',
      color: colors.text.default,
    },
    messageLabelText: {
      ...fontStyles.bold,
      fontSize: 16,
      marginBottom: 4,
      color: colors.text.default,
    },
    readMore: {
      color: colors.primary.default,
      fontSize: 14,
      ...fontStyles.bold,
    },
    warningWrapper: {
      width: '100%',
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    actionViewChild: {
      paddingHorizontal: 24,
    },
    accountInfoCardWrapper: {
      marginBottom: 20,
      width: '100%',
    },
    children: {
      alignSelf: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      width: '100%',
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
    },
    arrowIconWrapper: {
      flexGrow: 1,
      alignItems: 'flex-end',
    },
    arrowIcon: {
      color: colors.icon.muted,
    },
    blockaidBanner: {
      marginHorizontal: 20,
      marginBottom: 20,
    },
  });

/**
 * PureComponent that renders scrollable content inside signature request user interface
 */
class SignatureRequest extends PureComponent {
  static propTypes = {
    /**
     * Object representing the navigator
     */
    navigation: PropTypes.object,
    /**
     * Callback triggered when this message signature is rejected
     */
    onReject: PropTypes.func,
    /**
     * Callback triggered when this message signature is approved
     */
    onConfirm: PropTypes.func,
    /**
     * Content to display above the action buttons
     */
    children: PropTypes.node,
    /**
     * Object containing current page title and url
     */
    currentPageInformation: PropTypes.object,
    /**
     * String representing signature type
     */
    type: PropTypes.string,
    /**
     * String representing the selected network
     */
    networkType: PropTypes.string,
    /**
     * Whether it should display the warning message
     */
    showWarning: PropTypes.bool,
    /**
     * Whether it should render the expand arrow icon
     */
    truncateMessage: PropTypes.bool,
    /**
     * Expands the message box on press.
     */
    toggleExpandedMessage: PropTypes.func,
    /**
     * Active address of account that triggered signing.
     */
    fromAddress: PropTypes.string,
    isSigningQRObject: PropTypes.bool,
    QRState: PropTypes.object,
    /**
     * A string that represents the selected address
     */
    selectedAddress: PropTypes.string,
    testID: PropTypes.string,
    securityAlertResponse: PropTypes.object,
    /**
     * Metrics injected by withMetricsAwareness HOC
     */
    metrics: PropTypes.object,
  };

  /**
   * Calls trackCancelSignature and onReject callback
   */
  onReject = () => {
    this.props.onReject();
    this.props.metrics.trackEvent(
      MetaMetricsEvents.TRANSACTIONS_CANCEL_SIGNATURE,
      this.getTrackingParams(),
    );
  };

  /**
   * Calls trackConfirmSignature and onConfirm callback
   */
  onConfirm = () => {
    this.props.onConfirm();
    this.props.metrics.trackEvent(
      MetaMetricsEvents.TRANSACTIONS_CONFIRM_SIGNATURE,
      this.getTrackingParams(),
    );
  };

  /**
   * Returns corresponding tracking params to send
   *
   * @return {object} - Object containing network and functionType
   */
  getTrackingParams = () => {
    const { type, networkType } = this.props;
    return {
      network: networkType,
      functionType: type,
    };
  };

  goToWarning = () => {
    this.props.onReject();
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io',
        title: 'support.metamask.io',
      },
    });
  };

  getStyles = () => {
    const colors = this.context.colors || mockTheme.colors;
    return createStyles(colors);
  };

  renderWarning = () => {
    const styles = this.getStyles();

    return (
      <Text>
        {strings('signature_request.eth_sign_warning')}
        {` `}
        <Text style={styles.warningLink}>
          {strings('signature_request.learn_more')}
        </Text>
      </Text>
    );
  };

  renderActionViewChildren = () => {
    const {
      children,
      currentPageInformation,
      truncateMessage,
      toggleExpandedMessage,
      fromAddress,
    } = this.props;
    const styles = this.getStyles();
    const url = currentPageInformation.url;
    const icon = currentPageInformation.icon;

    const title = getCleanUrl(url);
    const arrowIcon = truncateMessage ? this.renderArrowIcon() : null;

    return (
      <View style={styles.actionViewChild}>
        <View style={styles.accountInfoCardWrapper}>
          <AccountInfoCard
            operation="signing"
            fromAddress={fromAddress}
            origin={title}
          />
        </View>
        <TouchableOpacity
          style={styles.children}
          onPress={truncateMessage ? toggleExpandedMessage : null}
        >
          <WebsiteIcon
            style={styles.domainLogo}
            title={title}
            url={url}
            icon={icon}
          />
          <View style={styles.messageColumn}>
            <Text style={styles.messageLabelText}>
              {strings('signature_request.message')}:
            </Text>
            {children}
            {truncateMessage ? (
              <Text style={styles.readMore}>
                {strings('signature_request.read_more')}
              </Text>
            ) : null}
          </View>
          <View style={styles.arrowIconWrapper}>{arrowIcon}</View>
        </TouchableOpacity>
      </View>
    );
  };

  renderArrowIcon = () => {
    const styles = this.getStyles();

    return (
      <View style={styles.arrowIconWrapper}>
        <Ionicons
          name={'ios-arrow-forward'}
          size={20}
          style={styles.arrowIcon}
        />
      </View>
    );
  };

  onContactUsClicked = async () => {
    const { fromAddress, type } = this.props;
    const analyticsParams = {
      ...(await getAnalyticsParams(
        {
          from: fromAddress,
        },
        type,
      )),
      external_link_clicked: 'security_alert_support_link',
    };
    this.props.metrics.trackEvent(
      MetaMetricsEvents.SIGNATURE_REQUESTED,
      analyticsParams,
    );
  };

  renderSignatureRequest() {
    const { securityAlertResponse, showWarning, type, selectedAddress } =
      this.props;
    let expandedHeight;
    const styles = this.getStyles();

    const isLedgerAccount = isHardwareAccount(selectedAddress, [
      ExtendedKeyringTypes.ledger,
    ]);

    if (Device.isMediumDevice()) {
      expandedHeight = styles.expandedHeight2;
      if (type === 'ethSign') {
        expandedHeight = styles.expandedHeight1;
      }
    }

    let confirmButtonState = ConfirmButtonState.Normal;
    if (securityAlertResponse?.result_type === ResultType.Malicious) {
      confirmButtonState = ConfirmButtonState.Error;
    } else if (securityAlertResponse?.result_type === ResultType.Warning) {
      confirmButtonState = ConfirmButtonState.Warning;
    }

    return (
      <View testID={this.props.testID} style={[styles.root, expandedHeight]}>
        <ActionView
          cancelTestID={SigningModalSelectorsIDs.CANCEL_BUTTON}
          confirmTestID={SigningModalSelectorsIDs.SIGN_BUTTON}
          cancelText={strings('signature_request.cancel')}
          confirmText={
            isLedgerAccount
              ? strings('ledger.sign_with_ledger')
              : strings('signature_request.sign')
          }
          onCancelPress={this.onReject}
          onConfirmPress={this.onConfirm}
          confirmButtonMode="sign"
          confirmButtonState={confirmButtonState}
        >
          <View>
            <View style={styles.signingInformation}>
              <Text style={styles.signText}>
                {strings('signature_request.signing')}
              </Text>
              {showWarning ? (
                <TouchableOpacity
                  style={styles.warningWrapper}
                  onPress={this.goToWarning}
                >
                  <WarningMessage
                    type={'error'}
                    warningMessage={this.renderWarning()}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
            <BlockaidBanner
              securityAlertResponse={securityAlertResponse}
              style={styles.blockaidBanner}
              onContactUsClicked={this.onContactUsClicked}
            />
            {this.renderActionViewChildren()}
          </View>
        </ActionView>
      </View>
    );
  }

  renderQRDetails() {
    const { QRState, fromAddress } = this.props;
    const styles = this.getStyles();

    return (
      <View style={[styles.root]}>
        <QRSigningDetails
          QRState={QRState}
          showCancelButton
          showHint={false}
          bypassAndroidCameraAccessCheck={false}
          fromAddress={fromAddress}
        />
      </View>
    );
  }

  render() {
    const { isSigningQRObject } = this.props;
    return isSigningQRObject
      ? this.renderQRDetails()
      : this.renderSignatureRequest();
  }
}

const mapStateToProps = (state) => ({
  selectedAddress: selectSelectedInternalAccountChecksummedAddress(state),
  networkType: selectProviderType(state),
  securityAlertResponse: state.signatureRequest.securityAlertResponse,
});

SignatureRequest.contextType = ThemeContext;

export default connect(mapStateToProps)(
  withQRHardwareAwareness(withMetricsAwareness(SignatureRequest)),
);
