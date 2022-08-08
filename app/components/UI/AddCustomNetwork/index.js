import React, { useState } from 'react';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import TransactionHeader from '../TransactionHeader';
import { strings } from '../../../../locales/i18n';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import Icon from 'react-native-vector-icons/FontAwesome';
import Alert, { AlertType } from '../../Base/Alert';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import Text from '../../Base/Text';
import { useTheme } from '../../../util/theme';
import { CANCEL_BUTTON_ID } from '../../../constants/test-ids';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    accountCardWrapper: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 10,
      padding: 16,
      margin: 24,
    },
    intro: {
      fontSize: Device.isSmallDevice() ? 18 : 24,
      marginBottom: 16,
      marginTop: 16,
      marginRight: 24,
      marginLeft: 24,
    },
    warning: {
      paddingHorizontal: 24,
      fontSize: 13,
      width: '100%',
      paddingBottom: 12,
    },
    warningSubtext: {
      lineHeight: 20,
      paddingHorizontal: 24,
      fontSize: 13,
      width: '100%',
    },
    actionContainer: {
      flex: 0,
      flexDirection: 'row',
      padding: 24,
    },
    button: {
      flex: 1,
    },
    cancel: {
      marginRight: 8,
    },
    confirm: {
      marginLeft: 8,
    },
    actionTouchable: {
      flexDirection: 'column',
      alignItems: 'center',
    },
    viewDetailsText: {
      fontSize: 12,
      lineHeight: 16,
    },
    textSection: {
      flexDirection: 'row',
      paddingBottom: 7,
    },
    textSectionLast: {
      flexDirection: 'row',
    },
    networkInfoTitle: {
      paddingRight: 10,
    },
    networkInfoValue: {
      flex: 1,
      fontSize: 13,
    },
    detailsBackButton: {
      height: 24,
      width: 24,
      justifyContent: 'space-around',
      alignItems: 'center',
      textAlign: 'center',
      padding: 24,
    },
    detailsBackIcon: {
      width: 24,
      height: 24,
      color: colors.text.default,
      textAlign: 'center',
    },
    detailsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    flexAux: {
      flex: 1,
    },
    alertContainer: {
      marginHorizontal: 24,
      marginBottom: 16,
    },
    alertIcon: {
      fontSize: 20,
      ...fontStyles.bold,
      color: colors.warning.default,
      marginRight: 6,
    },
    alertText: {
      lineHeight: 18,
      color: colors.text.default,
    },
  });

/**
 * Account access approval component
 */
const AddCustomNetwork = ({
  customNetworkInformation,
  currentPageInformation,
  onCancel,
  onConfirm,
}) => {
  const [viewDetails, setViewDetails] = useState(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  /**
   * Calls onConfirm callback and analytics to track connect confirmed event
   */
  const confirm = () => {
    onConfirm && onConfirm();
  };

  /**
   * Calls onConfirm callback and analytics to track connect canceled event
   */
  const cancel = () => {
    onCancel && onCancel();
  };

  /**
   * Toggle network details
   */
  const toggleViewDetails = () => {
    setViewDetails((viewDetails) => !viewDetails);
  };

  const renderNetworkInfo = (moreDetails) => (
    <View style={styles.accountCardWrapper}>
      <View style={styles.textSection}>
        <Text small primary noMargin style={styles.networkInfoTitle}>
          {strings('add_custom_network.display_name')}
        </Text>
        <Text primary bold noMargin right style={styles.networkInfoValue}>
          {customNetworkInformation.chainName}
        </Text>
      </View>
      <View style={styles.textSection}>
        <Text small primary noMargin style={styles.networkInfoTitle}>
          {strings('add_custom_network.chain_id')}
        </Text>
        <Text primary bold noMargin right style={styles.networkInfoValue}>
          {customNetworkInformation.chainId}
        </Text>
      </View>
      <View style={moreDetails ? styles.textSection : styles.textSectionLast}>
        <Text small primary noMargin style={styles.networkInfoTitle}>
          {strings('add_custom_network.network_url')}
        </Text>
        <Text primary bold noMargin right style={styles.networkInfoValue}>
          {customNetworkInformation.rpcUrl}
        </Text>
      </View>
      {moreDetails ? (
        <View>
          <View style={styles.textSection}>
            <Text small primary noMargin style={styles.networkInfoTitle}>
              {strings('add_custom_network.currency_symbol')}
            </Text>
            <Text primary bold noMargin right style={styles.networkInfoValue}>
              {customNetworkInformation.ticker}
            </Text>
          </View>
          <View style={styles.textSectionLast}>
            <Text small primary noMargin style={styles.networkInfoTitle}>
              {strings('add_custom_network.block_explorer_url')}
            </Text>
            <Text primary bold noMargin right style={styles.networkInfoValue}>
              {customNetworkInformation.blockExplorerUrl}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  const renderDetails = () => (
    <View>
      <View style={styles.detailsContainer}>
        <View style={styles.flexAux}>
          <TouchableOpacity
            onPress={toggleViewDetails}
            style={styles.detailsBackButton}
            testID={'go-back-button'}
          >
            <Icon name="angle-left" size={24} style={styles.detailsBackIcon} />
          </TouchableOpacity>
        </View>
        <Text bold centered primary noMargin>
          {strings('add_custom_network.details_title')}
        </Text>
        <View style={styles.flexAux} />
      </View>
      {renderNetworkInfo(true)}
    </View>
  );

  const openHowToUseCustomNetworks = () => {
    Linking.openURL(
      'https://metamask.zendesk.com/hc/en-us/articles/360056196151',
    );
  };
  const openHowToVerifyCustomNetworks = () => {
    Linking.openURL(
      'https://metamask.zendesk.com/hc/en-us/articles/360057142392',
    );
  };

  const renderAlert = () => {
    if (!customNetworkInformation.alert) return null;
    let alertText;
    if (customNetworkInformation.alert === 'INVALID_CHAIN') {
      alertText = strings('add_custom_network.invalid_chain', {
        rpcUrl: customNetworkInformation.rpcUrl,
      });
    }
    if (customNetworkInformation.alert === 'UNRECOGNIZED_CHAIN') {
      alertText = strings('add_custom_network.unrecognized_chain');
    }

    return (
      <Alert
        type={AlertType.Warning}
        testID={'error-message-warning'}
        style={styles.alertContainer}
        renderIcon={() => <EvilIcons name="bell" style={styles.alertIcon} />}
      >
        <Text primary noMargin style={styles.alertText}>
          <Text primary bold noMargin style={styles.alertText}>
            {alertText}
            {'\n'}
          </Text>
          <Text primary noMargin>
            {strings('add_custom_network.alert_recommend')}{' '}
            <Text primary link noMargin onPress={openHowToVerifyCustomNetworks}>
              {strings('add_custom_network.alert_verify')}
            </Text>
            .
          </Text>
        </Text>
      </Alert>
    );
  };

  const renderApproval = () => (
    <ScrollView>
      <TransactionHeader currentPageInformation={currentPageInformation} />
      <Text centered bold primary noMargin style={styles.intro}>
        {strings('add_custom_network.title')}
      </Text>
      <Text primary centered noMargin style={styles.warning}>
        {strings('add_custom_network.warning')}
      </Text>
      <Text primary centered noMargin style={styles.warningSubtext}>
        <Text primary bold noMargin>
          {strings('add_custom_network.warning_subtext_1')}
        </Text>{' '}
        {strings('add_custom_network.warning_subtext_2')}
        <Text primary link noMargin onPress={openHowToUseCustomNetworks}>
          {' '}
          {strings('add_custom_network.warning_subtext_3')}
        </Text>
        .
      </Text>
      {renderNetworkInfo()}
      {renderAlert()}
      <TouchableOpacity
        style={styles.actionTouchable}
        onPress={toggleViewDetails}
      >
        <View style={styles.viewDetailsWrapper}>
          <Text bold link centered noMargin style={styles.viewDetailsText}>
            {strings('spend_limit_edition.view_details')}
          </Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actionContainer}>
        <StyledButton
          type={'cancel'}
          onPress={cancel}
          containerStyle={[styles.button, styles.cancel]}
          testID={CANCEL_BUTTON_ID}
        >
          {strings('spend_limit_edition.cancel')}
        </StyledButton>
        <StyledButton
          type={'confirm'}
          onPress={confirm}
          containerStyle={[styles.button, styles.confirm]}
          testID={'connect-approve-button'}
        >
          {strings('spend_limit_edition.approve')}
        </StyledButton>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      {viewDetails ? renderDetails() : renderApproval()}
    </View>
  );
};

AddCustomNetwork.propTypes = {
  /**
   * Object containing current page title, url, and icon href
   */
  currentPageInformation: PropTypes.object,
  /**
   * Callback triggered on account access approval
   */
  onConfirm: PropTypes.func,
  /**
   * Callback triggered on account access rejection
   */
  onCancel: PropTypes.func,
  /**
   * Object containing info of the network to add
   */
  customNetworkInformation: PropTypes.object,
};

export default AddCustomNetwork;
