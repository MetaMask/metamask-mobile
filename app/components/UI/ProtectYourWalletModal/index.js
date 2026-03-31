import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  IconName,
  IconSize,
  IconColor,
  Button,
  ButtonVariant,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
import ActionModal from '../ActionModal';
import { connect } from 'react-redux';
import { protectWalletModalNotVisible } from '../../../actions/user';
import { strings } from '../../../../locales/i18n';
import scaling from '../../../util/scaling';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { ProtectWalletModalSelectorsIDs } from './ProtectWalletModal.testIds';
import { analytics } from '../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';

import protectWalletImage from '../../../images/explain-backup-seedphrase.png';

class ProtectYourWalletModal extends PureComponent {
  static propTypes = {
    navigation: PropTypes.object,
    protectWalletModalNotVisible: PropTypes.func,
    protectWalletModalVisible: PropTypes.bool,
    passwordSet: PropTypes.bool,
    isSeedlessOnboardingLoginFlow: PropTypes.bool,
  };

  goToBackupFlow = () => {
    this.props.protectWalletModalNotVisible();
    this.props.navigation.navigate(
      'SetPasswordFlow',
      this.props.passwordSet ? { screen: 'AccountBackupStep1' } : undefined,
    );
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_SECURITY_PROTECT_ENGAGED,
      )
        .addProperties({
          wallet_protection_required: false,
          source: 'Modal',
        })
        .build(),
    );
  };

  onLearnMore = () => {
    this.props.protectWalletModalNotVisible();
    this.props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/',
        title: strings('protect_wallet_modal.title'),
      },
    });
  };

  onDismiss = () => {
    this.props.protectWalletModalNotVisible();
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_SECURITY_PROTECT_DISMISSED,
      )
        .addProperties({
          wallet_protection_required: false,
          source: 'Modal',
        })
        .build(),
    );
  };

  render() {
    if (this.props.isSeedlessOnboardingLoginFlow) {
      return null;
    }

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
        cancelTestID={ProtectWalletModalSelectorsIDs.CANCEL_BUTTON}
        confirmTestID={ProtectWalletModalSelectorsIDs.CONFIRM_BUTTON}
      >
        <Box
          twClassName="mt-6 mx-6 flex-1"
          testID={ProtectWalletModalSelectorsIDs.CONTAINER}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Center}
            alignItems={BoxAlignItems.Center}
          >
            <Box twClassName="w-6" />
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
              twClassName="text-center flex-1"
            >
              {strings('protect_wallet_modal.title')}
            </Text>
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Sm}
              iconProps={{ color: IconColor.IconDefault, size: IconSize.Sm }}
              onPress={this.onDismiss}
            />
          </Box>

          <Box alignItems={BoxAlignItems.Center} twClassName="mb-3 mt-8">
            <Image
              source={protectWalletImage}
              style={{
                width: scaling.scale(135, { baseModel: 1 }),
                height: scaling.scale(160, { baseModel: 1 }),
              }}
            />
          </Box>

          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextDefault}
            twClassName="text-center mb-6"
          >
            {strings('protect_wallet_modal.text')}
            <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Bold}>
              {' ' + strings('protect_wallet_modal.text_bold')}
            </Text>
          </Text>

          <Button
            variant={ButtonVariant.Tertiary}
            onPress={this.onLearnMore}
            testID={ProtectWalletModalSelectorsIDs.LEARN_MORE_BUTTON}
            twClassName="w-full mb-3.5"
          >
            {strings('protect_wallet_modal.action')}
          </Button>
        </Box>
      </ActionModal>
    );
  }
}

const mapStateToProps = (state) => ({
  protectWalletModalVisible: state.user.protectWalletModalVisible,
  passwordSet: state.user.passwordSet,
  isSeedlessOnboardingLoginFlow: selectSeedlessOnboardingLoginFlow(state),
});

const mapDispatchToProps = (dispatch) => ({
  protectWalletModalNotVisible: () => dispatch(protectWalletModalNotVisible()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProtectYourWalletModal);
