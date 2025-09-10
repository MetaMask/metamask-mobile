import React, { useCallback } from 'react';
import { View, Linking } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import PickerNetwork from '../../../component-library/components/Pickers/PickerNetwork';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../selectors/networkInfos';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import getDecimalChainId from '../../../util/networks/getDecimalChainId';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ConnectedAccountsSelectorsIDs } from '../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import AppConstants from '../../../core/AppConstants';
import styles from './ManageNetworks.styles';
import { selectChainId } from '../../../selectors/networkController';

export default function ManageNetworksComponent() {
  const chainId = useSelector(selectChainId);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const networkImageSource = useSelector(selectNetworkImageSource);
  const networkName = useSelector(selectNetworkName);

  const switchNetwork = useCallback(() => {
    navigation.navigate(Routes.SHEET.NETWORK_SELECTOR);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED)
        .addProperties({
          chain_id: getDecimalChainId(chainId),
        })
        .build(),
    );
  }, [navigation, trackEvent, chainId, createEventBuilder]);

  const openPrivacyPolicyLink = useCallback(() => {
    Linking.openURL(AppConstants.URLS.PRIVACY_POLICY_2024);
  }, []);

  const openAddSolanaAccountPrivacyPolicyLink = useCallback(() => {
    Linking.openURL(AppConstants.URLS.ADD_SOLANA_ACCOUNT_PRIVACY_POLICY);
  }, []);

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
        <Text
          color={TextColor.Info}
          testID="privacy-policy-link"
          onPress={openPrivacyPolicyLink}
        >
          {strings('default_settings.privacy_policy')}
        </Text>
        {strings('default_settings.manage_networks_body2')}
        <Text
          color={TextColor.Info}
          testID="solana-privacy-policy-link"
          onPress={openAddSolanaAccountPrivacyPolicyLink}
        >
          {strings('default_settings.manage_networks_body3')}
        </Text>
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
