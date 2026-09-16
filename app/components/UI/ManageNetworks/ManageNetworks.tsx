import React, { useCallback } from 'react';
import { View, Linking } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import {
  selectNetworkName,
  selectNetworkImageSource,
} from '../../../selectors/networkInfos';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import { useAnalytics } from '../../../components/hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { ConnectedAccountsSelectorsIDs } from '../../Views/MultichainAccounts/shared/ConnectedAccountModal.testIds';
import AppConstants from '../../../core/AppConstants';
import styles from './ManageNetworks.styles';
import {
  AvatarNetwork,
  AvatarNetworkSize,
  SelectButton,
  SelectButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export default function ManageNetworksComponent() {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const networkImageSource = useSelector(selectNetworkImageSource);
  const networkName = useSelector(selectNetworkName);

  const switchNetwork = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.NETWORK_SELECTOR,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.NETWORK_SELECTOR_PRESSED).build(),
    );
  }, [navigation, trackEvent, createEventBuilder]);

  const openPrivacyPolicyLink = useCallback(() => {
    Linking.openURL(AppConstants.URLS.PRIVACY_POLICY_2024);
  }, []);

  const openAddSolanaAccountPrivacyPolicyLink = useCallback(() => {
    Linking.openURL(AppConstants.URLS.ADD_SOLANA_ACCOUNT_PRIVACY_POLICY);
  }, []);

  return (
    <View style={styles.setting}>
      <View style={styles.heading}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('default_settings.manage_networks')}
        </Text>
      </View>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        style={styles.description}
      >
        {strings('default_settings.manage_networks_body')}
        <Text
          color={TextColor.InfoDefault}
          testID="privacy-policy-link"
          onPress={openPrivacyPolicyLink}
        >
          {strings('default_settings.privacy_policy')}
        </Text>
        {strings('default_settings.manage_networks_body2')}
        <Text
          color={TextColor.InfoDefault}
          testID="solana-privacy-policy-link"
          onPress={openAddSolanaAccountPrivacyPolicyLink}
        >
          {strings('default_settings.manage_networks_body3')}
        </Text>
      </Text>
      <SelectButton
        testID={ConnectedAccountsSelectorsIDs.NETWORK_PICKER}
        variant={SelectButtonVariant.Primary}
        placeholder={strings('wallet.current_network')}
        value={networkName}
        startAccessory={
          <AvatarNetwork
            src={networkImageSource}
            size={AvatarNetworkSize.Xs}
            name={networkName}
          />
        }
        textProps={{
          numberOfLines: 1,
        }}
        onPress={switchNetwork}
        twClassName="self-start my-4"
      />
    </View>
  );
}
