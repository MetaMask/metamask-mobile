import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { strings } from '../../../../../../../locales/i18n';
import { createStyles } from './styles';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectAccounts } from '../../../../../../selectors/accountTrackerController';
import {
  selectIdentities,
  selectSelectedAddress,
} from '../../../../../../selectors/preferencesController';
import { REVEAL_PRIVATE_KEY_SECTION } from '../../SecuritySettings.constants';
import { useMetrics } from '../../../../../../components/hooks/useMetrics';

const testIds = {
  section: REVEAL_PRIVATE_KEY_SECTION,
};

const RevealPrivateKey = () => {
  const styles = createStyles();
  const navigation = useNavigation();
  const { trackEvent } = useMetrics();

  const accounts = useSelector(selectAccounts);
  const identities = useSelector(selectIdentities);
  const selectedAddress = useSelector(selectSelectedAddress);

  const account = {
    ...identities[selectedAddress],
    ...accounts[selectedAddress],
  };

  const goToExportPrivateKey = () => {
    trackEvent(MetaMetricsEvents.REVEAL_PRIVATE_KEY_INITIATED, {});
    navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      credentialName: 'private_key',
      shouldUpdateNav: true,
    });
  };

  return (
    <View style={styles.setting} testID={testIds.section}>
      <Text variant={TextVariant.BodyLGMedium}>
        {strings('reveal_credential.private_key_title_for_account', {
          accountName: account.name,
        })}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('reveal_credential.private_key_warning', {
          accountName: account.name,
        })}
      </Text>
      <Button
        label={strings('reveal_credential.show_private_key')}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        onPress={goToExportPrivateKey}
        style={styles.confirm}
      />
    </View>
  );
};

export default RevealPrivateKey;
