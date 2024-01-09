/* eslint-disable react/prop-types */
import React, { useCallback, useState } from 'react';
import { View, Linking } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Engine from '../../../core/Engine';

import PickerNetwork from '../../../component-library/components/Pickers/PickerNetwork';
import Accordion from '../../../component-library/components/Accordions/Accordion';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import { DEFAULT_BUTTONLINK_LABEL_COLOR } from '../../../component-library/components/Buttons/Button/variants/ButtonLink/ButtonLink.constants';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NetworkVerificationInfo.styles';
import { CustomNetworkInformation } from './NetworkVerificationInfo.types';
import { ScrollView } from 'react-native-gesture-handler';
import { ADD_CUSTOM_NETWORK_ARTCILE } from '../../../constants/urls';
import { useSelector } from 'react-redux';
import { selectUseSafeChainsListValidation } from '../../../selectors/preferencesController';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';

/**
 * NetworkVerificationInfo component
 */
const NetworkVerificationInfo = ({
  customNetworkInformation,
  onReject,
  onConfirm,
}: {
  customNetworkInformation: CustomNetworkInformation;
  onReject: () => void;
  onConfirm: () => void;
}) => {
  const [networkInfoMaxHeight, setNetworkInfoMaxHeight] = useState<
    number | null
  >(null);
  const [networkDetailsExpanded, setNetworkDetailsExpanded] = useState(false);
  const { styles } = useStyles(styleSheet, {});
  const useSafeChainsListValidation = useSelector(
    selectUseSafeChainsListValidation,
  );
  const [showCheckNetwork, setShowCheckNetwork] = React.useState(false);
  const showCheckNetworkModal = () => setShowCheckNetwork(!showCheckNetwork);

  const toggleUseSafeChainsListValidation = (value: boolean) => {
    const { PreferencesController } = Engine.context;
    PreferencesController?.setUseSafeChainsListValidation(value);
    if (!value) PreferencesController?.setUseSafeChainsListValidation(value);
  };

  const renderNetworkInfo = () => (
    <ScrollView
      nestedScrollEnabled
      style={[
        styles.accountCardWrapper,
        networkInfoMaxHeight ? { maxHeight: networkInfoMaxHeight } : undefined,
      ]}
      onLayout={(event) => {
        if (!networkInfoMaxHeight) {
          setNetworkInfoMaxHeight(event.nativeEvent.layout.height);
        }
      }}
      contentContainerStyle={
        networkDetailsExpanded ? styles.nestedScrollContent : undefined
      }
    >
      <Text variant={TextVariant.BodyMDBold}>
        {strings('add_custom_network.display_name')}
      </Text>
      <Text style={styles.textSection}>
        {customNetworkInformation.chainName}
      </Text>

      <Text variant={TextVariant.BodyMDBold}>
        {strings('add_custom_network.chain_id')}
      </Text>
      <Text style={styles.textSection}>{customNetworkInformation.chainId}</Text>

      <Text variant={TextVariant.BodyMDBold}>
        {strings('add_custom_network.network_url')}
      </Text>
      <Text style={styles.textSection}>{customNetworkInformation.rpcUrl}</Text>

      <Accordion
        title={strings('spend_limit_edition.view_details')}
        onPress={() => setNetworkDetailsExpanded(!networkDetailsExpanded)}
      >
        <Text variant={TextVariant.BodyMDBold}>
          {strings('add_custom_network.currency_symbol')}
        </Text>
        <Text style={styles.textSection}>
          {customNetworkInformation.ticker}
        </Text>

        <Text variant={TextVariant.BodyMDBold}>
          {strings('add_custom_network.block_explorer_url')}
        </Text>
        <Text>{customNetworkInformation.blockExplorerUrl}</Text>
      </Accordion>
    </ScrollView>
  );

  const openHowToUseCustomNetworks = () => {
    Linking.openURL(ADD_CUSTOM_NETWORK_ARTCILE);
  };

  const renderBanner = () => {
    if (!useSafeChainsListValidation) {
      return (
        <View style={styles.alertBar}>
          <Banner
            variant={BannerVariant.Alert}
            description={
              strings('wallet.network_details_check') +
              strings('wallet.network_check_validation_desc')
            }
            actionButtonProps={{
              variant: ButtonVariants.Link,
              label: strings('wallet.turn_on_network_check_cta'),
              onPress: showCheckNetworkModal,
              textVariant: TextVariant.BodyMD,
            }}
          />
        </View>
      );
    }
  };

  const renderAlerts = useCallback(() => {
    if (!customNetworkInformation.alerts.length) return null;
    return customNetworkInformation.alerts.map(
      (networkAlert: {
        alertError: string;
        alertSeverity: BannerAlertSeverity;
        alertOrigin: string;
      }) => (
        <Banner
          variant={BannerVariant.Alert}
          severity={networkAlert.alertSeverity}
          description={networkAlert.alertError}
          testID={CommonSelectorsIDs.ERROR_MESSAGE}
          style={styles.textSection}
          key={networkAlert.alertOrigin}
        />
      ),
    );
  }, [customNetworkInformation.alerts, styles.textSection]);

  return showCheckNetwork ? (
    <View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {strings('app_settings.use_safe_chains_list_validation')}
        </Text>
        <Text style={styles.bottomSpace}>
          {strings('app_settings.use_safe_chains_list_validation_desc')}
        </Text>

        <Text>{strings('networks.network_select_confirm_use_safe_check')}</Text>
      </View>

      <BottomSheetFooter
        buttonPropsArray={[
          {
            onPress: showCheckNetworkModal,
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            testID: CommonSelectorsIDs.CANCEL_BUTTON,
          },
          {
            onPress: () => {
              toggleUseSafeChainsListValidation(true);
              showCheckNetworkModal();
            },
            label: strings('confirmation_modal.confirm_cta'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            testID: CommonSelectorsIDs.CONNECT_BUTTON,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
      />
    </View>
  ) : (
    <View>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {strings('add_custom_network.title')}
        </Text>
      </BottomSheetHeader>
      <ScrollView style={styles.root}>
        <PickerNetwork
          imageSource={customNetworkInformation.icon}
          label={customNetworkInformation.chainName}
          style={styles.networkSection}
          disabled
        />
        {renderAlerts()}
        {renderBanner()}
        <Text style={styles.textCentred}>
          {strings('add_custom_network.warning_subtext_new.1')}{' '}
          <Text
            onPress={openHowToUseCustomNetworks}
            color={DEFAULT_BUTTONLINK_LABEL_COLOR}
          >
            {strings('add_custom_network.warning_subtext_new.2')}
          </Text>
        </Text>
        {renderNetworkInfo()}
      </ScrollView>
      <BottomSheetFooter
        buttonPropsArray={[
          {
            onPress: onReject,
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            testID: CommonSelectorsIDs.CANCEL_BUTTON,
          },
          {
            onPress: onConfirm,
            label: strings('confirmation_modal.confirm_cta'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            testID: CommonSelectorsIDs.CONNECT_BUTTON,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
      />
    </View>
  );
};

export default NetworkVerificationInfo;
