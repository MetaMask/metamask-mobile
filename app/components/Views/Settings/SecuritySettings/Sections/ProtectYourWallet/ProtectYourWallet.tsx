import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import StyledButton from '../../../../../UI/StyledButton';
import SettingsNotification from '../../../../../UI/SettingsNotification';
import SeedPhraseVideo from '../../../../../UI/SeedPhraseVideo';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import AnalyticsV2 from '../../../../../../util/analyticsV2';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import { LEARN_MORE_URL } from '../../../../../../constants/urls';
import { REVEAL_SECRET_RECOVERY_PHRASE_BUTTON_ID } from '../../../../../../constants/test-ids';
import { createStyles } from './styles';
import Routes from '../../../../../../constants/navigation/Routes';

interface IProtectYourWalletProps {
  srpBackedup: boolean;
  hintText: string;
  toggleHint: () => void;
}

const ProtectYourWallet = ({
  srpBackedup,
  hintText,
  toggleHint,
}: IProtectYourWalletProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const WarningIcon = () => (
    <Icon size={16} color={colors.error.default} name="exclamation-triangle" />
  );

  const goToRevealPrivateCredential = () => {
    AnalyticsV2.trackEvent(MetaMetricsEvents.REVEAL_SRP_INITIATED, {});
    AnalyticsV2.trackEvent(MetaMetricsEvents.REVEAL_SRP_CTA, {});
    navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      privateCredentialName: 'seed_phrase',
    });
  };

  const goToBackup = () => {
    navigation.navigate(Routes.ACCOUNT_BACKUP.STEP_1_B);
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SECURITY_STARTED, {
        source: 'Settings',
      });
    });
  };

  const onBack = () => navigation.goBack();

  return (
    <View style={[styles.setting, styles.firstSetting]}>
      <Text style={[styles.title, styles.bump]}>
        {!srpBackedup ? (
          <>
            <WarningIcon />{' '}
          </>
        ) : null}
        <Text style={[styles.title, styles.bump]}>
          {strings('app_settings.protect_title')}
        </Text>
      </Text>

      <SeedPhraseVideo onClose={onBack} />

      <Text style={styles.desc}>
        {strings(
          srpBackedup
            ? 'app_settings.protect_desc'
            : 'app_settings.protect_desc_no_backup',
        )}
      </Text>

      {!srpBackedup && (
        <TouchableOpacity onPress={() => Linking.openURL(LEARN_MORE_URL)}>
          <Text style={styles.learnMore}>
            {strings('app_settings.learn_more')}
          </Text>
        </TouchableOpacity>
      )}

      <SettingsNotification isWarning={!srpBackedup}>
        <Text
          style={[
            styles.warningText,
            srpBackedup ? styles.warningTextGreen : styles.warningTextRed,
          ]}
        >
          {strings(
            srpBackedup
              ? 'app_settings.seedphrase_backed_up'
              : 'app_settings.seedphrase_not_backed_up',
          )}
        </Text>
        {hintText && srpBackedup ? (
          <TouchableOpacity style={styles.viewHint} onPress={toggleHint}>
            <Text style={[styles.warningText, styles.warningBold]}>
              {strings('app_settings.view_hint')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </SettingsNotification>
      {!srpBackedup ? (
        <StyledButton
          type="blue"
          onPress={goToBackup}
          containerStyle={styles.confirm}
        >
          {strings('app_settings.back_up_now')}
        </StyledButton>
      ) : (
        <StyledButton
          type="normal"
          onPress={goToRevealPrivateCredential}
          containerStyle={styles.confirm}
          testID={REVEAL_SECRET_RECOVERY_PHRASE_BUTTON_ID}
        >
          {strings('reveal_credential.seed_phrase_title')}
        </StyledButton>
      )}
    </View>
  );
};

export default ProtectYourWallet;
