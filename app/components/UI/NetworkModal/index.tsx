import Modal from 'react-native-modal';
import React from 'react';
import { View, StyleSheet, Linking, Platform } from 'react-native';
import StyledButton from '../StyledButton';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import NetworkDetails from './NetworkDetails';
import NetworkAdded from './NetworkAdded';
import Engine from '../../../core/Engine';
import { isprivateConnection } from '../../../util/networks';
import getDecimalChainId from '../../../util/networks/getDecimalChainId';
import URLPARSE from 'url-parse';
import scaling from '../../../util/scaling';
import { isWebUri } from 'valid-url';
import InfoModal from '../Swaps/components/InfoModal';
import ImageIcons from '../../UI/ImageIcon';
import { useDispatch, useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { BannerVariant } from '../../../component-library/components/Banners/Banner';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../component-library/components/Texts/Text';
import Banner from '../../../component-library/components/Banners/Banner/Banner';
import AnalyticsV2 from '../../../util/analyticsV2';

import { useTheme } from '../../../util/theme';
import { networkSwitched } from '../../../actions/onboardNetwork';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { NetworkApprovalModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkApprovalModal.selectors';
import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import { selectUseSafeChainsListValidation } from '../../../selectors/preferencesController';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { ButtonProps } from '../../../component-library/components/Buttons/Button/Button.types';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    alertBar: {
      width: '100%',
      marginBottom: 15,
    },
    modalContainer: {
      borderRadius: 10,
      backgroundColor: colors.background.default,
      padding: 20,
      paddingTop: 4,
    },
    buttonView: {
      flexDirection: 'row',
      paddingVertical: 16,
    },
    button: {
      flex: 1,
    },
    cancel: {
      marginRight: 8,
      borderColor: colors.text.muted,
      borderWidth: 1,
    },
    confirm: {
      marginLeft: 8,
    },
    networkInformation: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      borderWidth: 1,
      borderColor: colors.text.muted,
      borderRadius: 10,
      padding: 16,
      marginBottom: 10,
    },
    title: {
      ...fontStyles.bold,
      fontSize: scaling.scale(18),
      textAlign: 'center',
      color: colors.text.default,
      lineHeight: 34,
      marginVertical: 10,
      paddingHorizontal: 16,
    },
    bottomSpace: {
      marginBottom: 10,
    },
    nameWrapper: {
      backgroundColor: colors.background.alternative,
      marginRight: '15%',
      marginLeft: '15%',
      paddingVertical: 5,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    infoIconContainer: {
      paddingHorizontal: 3,
    },
    infoIcon: {
      fontSize: 12,
      color: colors.icon.default,
    },
    actionContainer: {
      flex: 0,
      paddingVertical: 16,
      justifyContent: 'center',
    },
    popularNetworkImage: {
      width: 20,
      height: 20,
      marginRight: 10,
      borderRadius: 10,
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
    },
    notchWrapper: {
      alignSelf: 'stretch',
      padding: 4,
      alignItems: 'center',
    },
  });

interface NetworkProps {
  isVisible: boolean;
  onClose: () => void;
  networkConfiguration: any;
  navigation: any;
  shouldNetworkSwitchPopToWallet: boolean;
  onNetworkSwitch?: () => void;
}

const NetworkModals = (props: NetworkProps) => {
  const {
    navigation,
    isVisible,
    onClose,
    networkConfiguration: {
      chainId,
      nickname,
      ticker,
      rpcUrl,
      formattedRpcUrl,
      rpcPrefs: { blockExplorerUrl, imageUrl },
    },
    shouldNetworkSwitchPopToWallet,
    onNetworkSwitch,
  } = props;

  const [showDetails, setShowDetails] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(false);
  const [networkAdded, setNetworkAdded] = React.useState(false);
  const [showCheckNetwork, setShowCheckNetwork] = React.useState(false);

  const showDetailsModal = () => setShowDetails(!showDetails);
  const showCheckNetworkModal = () => setShowCheckNetwork(!showCheckNetwork);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const dispatch = useDispatch();

  const validateRpcUrl = (url: string) => {
    if (!isWebUri(url)) return false;
    return true;
  };

  const addNetwork = async () => {
    const validUrl = validateRpcUrl(rpcUrl);

    setNetworkAdded(validUrl);
  };

  const toggleUseSafeChainsListValidation = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController?.setUseSafeChainsListValidation(value);
    if (!value) PreferencesController?.setUseSafeChainsListValidation(value);
  };

  const cancelButtonProps: ButtonProps = {
    variant: ButtonVariants.Secondary,
    label: strings('accountApproval.cancel'),
    size: ButtonSize.Lg,
    onPress: showCheckNetworkModal,
    testID: NetworkApprovalModalSelectorsIDs.CANCEL_BUTTON,
  };

  const confirmButtonProps: ButtonProps = {
    variant: ButtonVariants.Primary,
    label: strings('enter_password.confirm_button'),
    size: ButtonSize.Lg,
    onPress: () => {
      toggleUseSafeChainsListValidation(true);
      showCheckNetworkModal();
    },
    testID: NetworkApprovalModalSelectorsIDs.CONFIRM_NETWORK_CHECK,
  };

  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );

  const showToolTip = () => setShowInfo(!showInfo);

  const goToLink = () => Linking.openURL(strings('networks.security_link'));

  const closeModal = () => {
    const { NetworkController } = Engine.context;
    const url = new URLPARSE(rpcUrl);
    const decimalChainId = getDecimalChainId(chainId);
    !isprivateConnection(url.hostname) && url.set('protocol', 'https:');
    NetworkController.upsertNetworkConfiguration(
      {
        rpcUrl: url.href,
        chainId: decimalChainId,
        ticker,
        nickname,
        rpcPrefs: { blockExplorerUrl },
      },
      {
        // Metrics-related properties required, but the metric event is a no-op
        // TODO: Use events for controller metric events
        referrer: 'ignored',
        source: 'ignored',
      },
    );
    onClose();
  };

  const switchNetwork = () => {
    const { NetworkController, CurrencyRateController } = Engine.context;
    const url = new URLPARSE(rpcUrl);
    const decimalChainId = getDecimalChainId(chainId);
    CurrencyRateController.setNativeCurrency(ticker);
    !isprivateConnection(url.hostname) && url.set('protocol', 'https:');
    NetworkController.upsertNetworkConfiguration(
      {
        rpcUrl: url.href,
        chainId: decimalChainId,
        ticker,
        nickname,
        rpcPrefs: { blockExplorerUrl },
      },
      {
        setActive: true,
        // Metrics-related properties required, but the metric event is a no-op
        // TODO: Use events for controller metric events
        referrer: 'ignored',
        source: 'ignored',
      },
    );

    const analyticsParamsAdd = {
      chain_id: decimalChainId,
      source: 'Popular network list',
      symbol: ticker,
    };

    AnalyticsV2.trackEvent(MetaMetricsEvents.NETWORK_ADDED, analyticsParamsAdd);

    closeModal();
    if (onNetworkSwitch) {
      onNetworkSwitch();
    } else {
      shouldNetworkSwitchPopToWallet
        ? navigation.navigate('WalletView')
        : navigation.goBack();
    }
    dispatch(networkSwitched({ networkUrl: url.href, networkStatus: true }));
  };

  return (
    <Modal
      isVisible={isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropOpacity={0.7}
      animationInTiming={600}
      animationOutTiming={600}
      swipeDirection={'down'}
      propagateSwipe
    >
      <View style={styles.modalContainer}>
        {showCheckNetwork ? (
          <View>
            <View>
              <Text reset style={styles.title}>
                {strings('app_settings.use_safe_chains_list_validation')}
              </Text>
              <Text style={styles.bottomSpace}>
                {strings('app_settings.use_safe_chains_list_validation_desc')}
              </Text>

              <Text>
                {strings('networks.network_select_confirm_use_safe_check')}
                <Text bold>
                  {strings('networks.network_settings_security_privacy')}
                </Text>{' '}
              </Text>

              <View style={styles.actionContainer}>
                <BottomSheetFooter
                  buttonsAlignment={ButtonsAlignment.Horizontal}
                  buttonPropsArray={[cancelButtonProps, confirmButtonProps]}
                />
              </View>
            </View>
          </View>
        ) : showDetails ? (
          <NetworkDetails
            goBack={showDetailsModal}
            chainId={chainId}
            nickname={nickname}
            ticker={ticker}
            rpcUrl={formattedRpcUrl || rpcUrl}
            blockExplorerUrl={blockExplorerUrl}
          />
        ) : networkAdded ? (
          <NetworkAdded
            nickname={nickname}
            closeModal={closeModal}
            switchNetwork={switchNetwork}
          />
        ) : (
          <View>
            {showInfo && (
              <InfoModal
                isVisible
                toggleModal={showToolTip}
                message={strings('networks.provider')}
              />
            )}
            <View style={styles.notchWrapper}>
              <View style={styles.notch} />
            </View>
            <Text reset style={styles.title}>
              {strings('networks.add_custom_network')}
            </Text>
            <View
              style={styles.nameWrapper}
              {...generateTestId(
                Platform,
                NetworkApprovalModalSelectorsIDs.CONTAINER,
              )}
            >
              <ImageIcons image={imageUrl} style={styles.popularNetworkImage} />
              <Text black>{nickname}</Text>
            </View>
            <Text centered style={styles.bottomSpace}>
              {strings('networks.network_infomation')}
            </Text>

            {!useSafeChainsListValidation ? (
              <View style={styles.alertBar}>
                <Banner
                  variant={BannerVariant.Alert}
                  description={strings('wallet.network_check_validation_desc')}
                  actionButtonProps={{
                    variant: ButtonVariants.Link,
                    label: strings('wallet.turn_on_network_check_cta'),
                    onPress: () => showCheckNetworkModal(),
                    textVariant: TextVariant.BodyMD,
                  }}
                />
              </View>
            ) : null}
            <Text centered style={styles.bottomSpace}>
              <Text centered>{strings('networks.network_endorsement')}</Text>

              <Text link onPress={goToLink}>
                {strings('networks.learn_about') + ' '}
                {strings('networks.network_risk')}
              </Text>
            </Text>
            <View style={styles.networkInformation}>
              <View>
                <Text black>{strings('networks.network_display_name')}</Text>
                <Text
                  bold
                  black
                  style={styles.bottomSpace}
                  testID={NetworkApprovalModalSelectorsIDs.DISPLAY_NAME}
                >
                  {nickname}
                </Text>
                <Text black>{strings('networks.network_chain_id')}</Text>
                <Text bold black style={styles.bottomSpace}>
                  {chainId}
                </Text>
                <Text black>{strings('networks.network_rpc_url')}</Text>
                <Text bold black style={styles.bottomSpace}>
                  {formattedRpcUrl || rpcUrl}
                </Text>
              </View>
            </View>
            <Text onPress={showDetailsModal} centered link bold>
              {strings('networks.view_details')}
            </Text>
            <View style={styles.buttonView}>
              <StyledButton
                type={'cancel'}
                onPress={onClose}
                containerStyle={[styles.button, styles.cancel]}
                testID={NetworkApprovalModalSelectorsIDs.CANCEL_BUTTON}
              >
                <Text centered>{strings('networks.cancel')}</Text>
              </StyledButton>
              <StyledButton
                type={'confirm'}
                onPress={addNetwork}
                containerStyle={[styles.button, styles.confirm]}
                testID={NetworkApprovalModalSelectorsIDs.APPROVE_BUTTON}
                disabled={!validateRpcUrl(rpcUrl)}
              >
                {strings('networks.approve')}
              </StyledButton>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default NetworkModals;
