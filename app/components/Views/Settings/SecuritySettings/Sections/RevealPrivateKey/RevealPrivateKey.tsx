import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text from '../../../../../../component-library/components/Texts/Text';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import AnalyticsV2 from '../../../../../../util/analyticsV2';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import { createStyles } from './styles';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectAccounts } from '../../../../../../selectors/accountTrackerController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../../../../selectors/preferencesController';

const testIds = {
  section: 'reveal-private-key-section',
};

const RevealPrivateKey = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const accounts = useSelector(selectAccounts);
  const identities = useSelector(selectIdentities);
  const selectedAddress = useSelector(selectSelectedAddress);

  const account = {
    ...identities[selectedAddress],
    ...accounts[selectedAddress],
  };

  const goToExportPrivateKey = () => {
    AnalyticsV2.trackEvent(MetaMetricsEvents.REVEAL_PRIVATE_KEY_INITIATED, {});
    navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      credentialName: 'private_key',
      shouldUpdateNav: true,
    });
  };

  return (
    <View style={styles.setting} testID={testIds.section}>
      <Text style={styles.title}>
        {strings('reveal_credential.private_key_title_for_account', {
          accountName: account.name,
        })}
      </Text>
      <Text style={styles.desc}>
        {strings('reveal_credential.private_key_warning', {
          accountName: account.name,
        })}
      </Text>
      <Button
        label={strings('reveal_credential.show_private_key')}
        variant={ButtonVariants.Primary}
        onPress={goToExportPrivateKey}
        style={styles.confirm}
      />
    </View>
  );
};

export default RevealPrivateKey;
