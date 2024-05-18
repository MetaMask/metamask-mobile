import React, { useCallback } from 'react';
import { View, Linking } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import PickerNetwork from '../../../component-library/components/Pickers/PickerNetwork';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { ProviderConfig } from '@metamask/network-controller';
import { selectProviderConfig } from '../../../selectors/networkController';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../selectors/networkInfos';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import getDecimalChainId from '../../../util/networks/getDecimalChainId';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ConnectedAccountsSelectorsIDs } from '../../../../e2e/selectors/Modals/ConnectedAccountModal.selectors';
import AppConstants from '../../../core/AppConstants';
import styles from './ManageNetworks.styles';

export default function ManageNetworksComponent() {
  const providerConfig: ProviderConfig = useSelector(selectProviderConfig);
  const navigation = useNavigation();
  const { trackEvent } = useMetrics();

  const networkImageSource = useSelector(selectNetworkImageSource);
  const networkName = useSelector(selectNetworkName);

  const switchNetwork = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });

    trackEvent(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED, {
      chain_id: getDecimalChainId(providerConfig.chainId),
    });
  }, [navigation, trackEvent, providerConfig]);

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.PRIVACY_POLICY_2024);
  };

  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('default_settings.manage_networks')}
        </Text>
      </View>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.description}
      >
        {strings('default_settings.manage_networks_body')}
        <Text color={TextColor.Info} onPress={handleLink}>
          {strings('default_settings.privacy_policy')}
        </Text>
        {strings('default_settings.manage_networks_body2')}
      </Text>
      <PickerNetwork
        label={networkName}
        imageSource={networkImageSource}
        onPress={switchNetwork}
        style={styles.networkPicker}
        testID={ConnectedAccountsSelectorsIDs.NETWORK_PICKER}
      />
    </View>
  );
}
