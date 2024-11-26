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
import { selectSelectedInternalAccount } from '../../../../../../selectors/accountsController';
import { REVEAL_PRIVATE_KEY_SECTION } from '../../SecuritySettings.constants';
import { useMetrics } from '../../../../../../components/hooks/useMetrics';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';

const testIds = {
  section: REVEAL_PRIVATE_KEY_SECTION,
};

const RevealPrivateKey = () => {
  const styles = createStyles();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const goToExportPrivateKey = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.REVEAL_PRIVATE_KEY_INITIATED,
      ).build(),
    );
    navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      credentialName: 'private_key',
      shouldUpdateNav: true,
    });
  };

  return (
    <View style={styles.setting} testID={testIds.section}>
      <Text variant={TextVariant.BodyLGMedium}>
        {strings('reveal_credential.private_key_title_for_account', {
          accountName: selectedInternalAccount?.metadata.name,
        })}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('reveal_credential.private_key_warning', {
          accountName: selectedInternalAccount?.metadata.name,
        })}
      </Text>
      <Button
        label={strings('reveal_credential.show_private_key')}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        onPress={goToExportPrivateKey}
        style={styles.confirm}
        testID={SecurityPrivacyViewSelectorsIDs.SHOW_PRIVATE_KEY}
      />
    </View>
  );
};

export default RevealPrivateKey;
