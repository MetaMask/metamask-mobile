import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import ActionModal from '../ActionModal';
import { fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { protectWalletModalNotVisible } from '../../../actions/user';
import Icon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import scaling from '../../../util/scaling';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { ThemeContext, mockTheme } from '../../../util/theme';

const protectWalletImage = require('../../../images/explain-backup-seedphrase.png'); // eslint-disable-line

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      marginTop: 24,
      marginHorizontal: 24,
      flex: 1,
    },
    title: {
      ...fontStyles.bold,
      color: colors.text.default,
      textAlign: 'center',
      fontSize: 20,
      flex: 1,
    },
    imageWrapper: {
      flexDirection: 'column',
      alignItems: 'center',
      marginBottom: 12,
      marginTop: 30,
    },
    image: {
      width: scaling.scale(135, { baseModel: 1 }),
      height: scaling.scale(160, { baseModel: 1 }),
    },
    text: {
      ...fontStyles.normal,
      color: colors.text.default,
      textAlign: 'center',
      fontSize: 14,
      marginBottom: 24,
    },
    closeIcon: {
      padding: 5,
    },
    learnMoreText: {
      textAlign: 'center',
      ...fontStyles.normal,
      color: colors.primary.default,
      marginBottom: 14,
      fontSize: 14,
    },
    modalXIcon: {
      fontSize: 16,
      color: colors.text.default,
    },
    titleWrapper: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    auxCenter: {
      width: 26,
    },
  });

/**
 * View that renders an action modal
 */
class ProtectYourWalletModal extends PureComponent {
  static propTypes = {
    navigation: PropTypes.object,
    /**
     * Hide this modal
     */
    protectWalletModalNotVisible: PropTypes.func,
    /**
     * Whether this modal is visible
     */
    protectWalletModalVisible: PropTypes.bool,
    /**
     * Boolean that determines if the user has set a password before
     */
    passwordSet: PropTypes.bool,
  };

  goToBackupFlow = () => {
    this.props.protectWalletModalNotVisible();
    this.props.navigation.navigate(
      'SetPasswordFlow',
      this.props.passwordSet ? { screen: 'AccountBackupStep1' } : undefined,
    );
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED,
        {
          wallet_protection_required: false,
          source: 'Modal',
        },
      );
    });
  };

  onLearnMore = () => {
    this.props.protectWalletModalNotVisible();
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://metamask.zendesk.com/hc/en-us/articles/360015489591-Basic-Safety-Tips',
        title: strings('protect_wallet_modal.title'),
      },
    });
  };

  onDismiss = () => {
    this.props.protectWalletModalNotVisible();
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.WALLET_SECURITY_PROTECT_DISMISSED,
        {
          wallet_protection_required: false,
          source: 'Modal',
        },
      );
    });
  };

  render() {
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <ActionModal
        modalVisible={this.props.protectWalletModalVisible}
        cancelText={strings('protect_wallet_modal.top_button')}
        confirmText={strings('protect_wallet_modal.bottom_button')}
        onCancelPress={this.goToBackupFlow}
        onRequestClose={this.onDismiss}
        onConfirmPress={this.onDismiss}
        cancelButtonMode={'sign'}
        confirmButtonMode={'transparent-blue'}
        verticalButtons
      >
        <View style={styles.wrapper} testID={'protect-wallet-modal'}>
          <View style={styles.titleWrapper}>
            <View style={styles.auxCenter} />
            <Text style={styles.title}>
              {strings('protect_wallet_modal.title')}
            </Text>
            <TouchableOpacity
              onPress={this.onDismiss}
              style={styles.closeIcon}
              hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
            >
              <Icon name="times" style={styles.modalXIcon} />
            </TouchableOpacity>
          </View>
          <View style={styles.imageWrapper}>
            <Image source={protectWalletImage} style={styles.image} />
          </View>

          <Text style={styles.text}>
            {strings('protect_wallet_modal.text')}
            <Text style={{ ...fontStyles.bold }}>
              {' ' + strings('protect_wallet_modal.text_bold')}
            </Text>
          </Text>

          <TouchableOpacity onPress={this.onLearnMore}>
            <Text style={styles.learnMoreText}>
              {strings('protect_wallet_modal.action')}
            </Text>
          </TouchableOpacity>
        </View>
      </ActionModal>
    );
  }
}

const mapStateToProps = (state) => ({
  protectWalletModalVisible: state.user.protectWalletModalVisible,
  passwordSet: state.user.passwordSet,
});

const mapDispatchToProps = (dispatch) => ({
  protectWalletModalNotVisible: (enable) =>
    dispatch(protectWalletModalNotVisible()),
});

ProtectYourWalletModal.contextType = ThemeContext;

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProtectYourWalletModal);
