import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import WebsiteIcon from '../WebsiteIcon';
import { getHost, getUrlObj } from '../../../util/browser';
import networkList from '../../../util/networks';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import AppConstants from '../../../core/AppConstants';
import { renderShortAddress } from '../../../util/address';
import { WALLET_CONNECT_ORIGIN } from '../../../util/walletconnect';
import { useTheme } from '../../../util/theme';
import { MM_SDK_REMOTE_ORIGIN } from '../../../core/SDKConnect';

const { ORIGIN_DEEPLINK, ORIGIN_QR_CODE } = AppConstants.DEEPLINKS;

const createStyles = (colors) =>
  StyleSheet.create({
    transactionHeader: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    domainLogo: {
      width: 56,
      height: 56,
      borderRadius: 32,
    },
    assetLogo: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    domanUrlContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      marginTop: 10,
    },
    secureIcon: {
      marginRight: 5,
      color: colors.text.default,
    },
    domainUrl: {
      ...fontStyles.bold,
      textAlign: 'center',
      fontSize: 14,
      color: colors.text.default,
    },
    networkContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    networkStatusIndicator: {
      borderRadius: 2.5,
      height: 5,
      width: 5,
    },
    network: {
      ...fontStyles.normal,
      textAlign: 'center',
      fontSize: 12,
      padding: 5,
      color: colors.text.default,
      textTransform: 'capitalize',
    },
    deeplinkIconContainer: {
      borderWidth: 1,
      borderColor: colors.border.default,
      width: 56,
      height: 56,
      borderRadius: 38,
    },
    deeplinkIcon: {
      alignSelf: 'center',
      lineHeight: 56,
    },
  });

/**
 * PureComponent that renders the transaction header used for signing, granting permissions and sending
 */
const TransactionHeader = (props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const originIsDeeplink =
    props.currentPageInformation.origin === ORIGIN_DEEPLINK ||
    props.currentPageInformation.origin === ORIGIN_QR_CODE;
  const originIsWalletConnect = props.currentPageInformation.origin?.startsWith(
    WALLET_CONNECT_ORIGIN,
  );

  const originIsMMSDKRemoteConn =
    props.currentPageInformation.origin?.startsWith(MM_SDK_REMOTE_ORIGIN);

  /**
   * Returns a small circular indicator, red if the current selected network is offline, green if it's online.
   *
   * @return {element} - JSX view element
   */
  const renderNetworkStatusIndicator = () => {
    const { networkType } = props;
    const networkStatusIndicatorColor =
      (networkList[networkType] && networkList[networkType].color) ||
      colors.error.default;
    const networkStatusIndicator = (
      <View
        style={[
          styles.networkStatusIndicator,
          { backgroundColor: networkStatusIndicatorColor },
        ]}
      />
    );
    return networkStatusIndicator;
  };

  /**
   * Returns a secure icon next to the dApp URL. Lock for https protocol, warning sign otherwise.
   *
   * @return {element} - JSX image element
   */
  const renderSecureIcon = () => {
    if (originIsDeeplink) return null;
    const { url, origin } = props.currentPageInformation;
    const name =
      getUrlObj(
        originIsWalletConnect
          ? origin.split(WALLET_CONNECT_ORIGIN)[1]
          : originIsMMSDKRemoteConn
          ? origin.split(MM_SDK_REMOTE_ORIGIN)[1]
          : url,
      ).protocol === 'https:'
        ? 'lock'
        : 'warning';
    return <FontAwesome name={name} size={15} style={styles.secureIcon} />;
  };

  const renderTopIcon = () => {
    const { currentEnsName, icon, origin } = props.currentPageInformation;
    let url = props.currentPageInformation.url;
    if (originIsDeeplink) {
      return (
        <View style={styles.deeplinkIconContainer}>
          <FontAwesome
            style={styles.deeplinkIcon}
            name={origin === ORIGIN_DEEPLINK ? 'link' : 'qrcode'}
            size={32}
            color={colors.text.default}
          />
        </View>
      );
    }
    let iconTitle = getHost(currentEnsName || url);
    if (originIsWalletConnect) {
      url = origin.split(WALLET_CONNECT_ORIGIN)[1];
      iconTitle = getHost(url);
    } else if (originIsMMSDKRemoteConn) {
      url = origin.split(MM_SDK_REMOTE_ORIGIN)[1];
    }
    return (
      <WebsiteIcon
        style={styles.domainLogo}
        viewStyle={styles.assetLogo}
        title={iconTitle}
        url={currentEnsName || url}
        icon={icon}
      />
    );
  };

  const renderTitle = () => {
    const { url, currentEnsName, spenderAddress, origin } =
      props.currentPageInformation;
    let title = '';
    if (originIsDeeplink) title = renderShortAddress(spenderAddress);
    else if (originIsWalletConnect)
      title = getHost(origin.split(WALLET_CONNECT_ORIGIN)[1]);
    else if (originIsMMSDKRemoteConn) {
      title = getHost(origin.split(MM_SDK_REMOTE_ORIGIN)[1]);
    } else title = getHost(currentEnsName || url || origin);

    return <Text style={styles.domainUrl}>{title}</Text>;
  };

  return (
    <View style={styles.transactionHeader}>
      {renderTopIcon()}
      <View style={styles.domanUrlContainer}>
        {renderSecureIcon()}
        {renderTitle()}
      </View>
      <View style={styles.networkContainer}>
        {renderNetworkStatusIndicator()}
        <Text style={styles.network}>
          {props.nickname || networkList[props.networkType]?.shortName}
        </Text>
      </View>
    </View>
  );
};

TransactionHeader.propTypes = {
  /**
   * Object containing current page title and url
   */
  currentPageInformation: PropTypes.object,
  /**
   * String representing the selected network
   */
  networkType: PropTypes.string,
  /**
   * Provider name
   */
  nickname: PropTypes.string,
};

const mapStateToProps = (state) => ({
  networkType: state.engine.backgroundState.NetworkController.provider.type,
  nickname: state.engine.backgroundState.NetworkController.provider.nickname,
});

export default connect(mapStateToProps)(TransactionHeader);
