/* eslint-disable react/prop-types */
import React, { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

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

/**
 * NetworkVerificationInfo component
 */
const NetworkVerificationInfo = ({
  customNetworkInformation,
}: {
  customNetworkInformation: CustomNetworkInformation;
}) => {
  const [networkInfoMaxHeight, setNetworkInfoMaxHeight] = useState<
    number | null
  >(null);
  const [networkDetailsExpanded, setNetworkDetailsExpanded] = useState(false);
  const { styles } = useStyles(styleSheet, {});

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

  return (
    <ScrollView style={styles.root}>
      <PickerNetwork
        imageSource={customNetworkInformation.icon}
        label={customNetworkInformation.chainName}
        style={styles.networkSection}
        disabled
      />
      {renderAlerts()}
      <Text>
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
  );
};

export default NetworkVerificationInfo;
