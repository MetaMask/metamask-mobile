import React, { ReactElement } from 'react';
import { View, Linking, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import SettingsNotification from '../../../../../UI/SettingsNotification';
import SeedPhraseVideo from '../../../../../UI/SeedPhraseVideo';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import AnalyticsV2 from '../../../../../../util/analyticsV2';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import { LEARN_MORE_URL } from '../../../../../../constants/urls';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
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

  const WarningIcon = (): ReactElement => (
    <Icon size={16} color={colors.error.default} name="exclamation-triangle" />
  );

  const openSRPQuiz = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
    });
  };

  const goToBackup = (): void => {
    navigation.navigate(Routes.ACCOUNT_BACKUP.STEP_1_B);
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SECURITY_STARTED, {
        source: 'Settings',
      });
    });
  };

  const onBack = (): void => navigation.goBack();

  return (
    <View style={[styles.setting, styles.firstSetting]}>
      <Text>
        {!srpBackedup ? (
          <>
            <WarningIcon />{' '}
          </>
        ) : null}
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.protect_title')}
        </Text>
      </Text>

      <SeedPhraseVideo onClose={onBack} />

      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings(
          srpBackedup
            ? 'app_settings.protect_desc'
            : 'app_settings.protect_desc_no_backup',
        )}
      </Text>

      {!srpBackedup && (
        <Button
          variant={ButtonVariants.Link}
          onPress={() => Linking.openURL(LEARN_MORE_URL)}
          label={strings('app_settings.learn_more')}
        />
      )}

      <SettingsNotification isWarning={!srpBackedup}>
        {srpBackedup ? (
          <Text
            style={{
              ...styles.warningText,
              ...styles.warningTextGreen,
            }}
          >
            {strings('app_settings.seedphrase_backed_up')}
          </Text>
        ) : (
          <Text
            style={{
              ...styles.warningText,
              ...styles.warningTextRed,
            }}
          >
            {strings('app_settings.seedphrase_not_backed_up')}
          </Text>
        )}
        {hintText && srpBackedup ? (
          <Button
            variant={ButtonVariants.Link}
            style={styles.viewHint}
            onPress={toggleHint}
            label={strings('app_settings.view_hint')}
          />
        ) : null}
      </SettingsNotification>
      {!srpBackedup ? (
        <Button
          label={strings('app_settings.back_up_now')}
          width={ButtonWidthTypes.Full}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={goToBackup}
          style={styles.confirm}
        />
      ) : (
        <Button
          label={strings('reveal_credential.seed_phrase_title')}
          width={ButtonWidthTypes.Full}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={openSRPQuiz}
          style={styles.confirm}
          testID={SecurityPrivacyViewSelectorsIDs.REVEAL_SEED_BUTTON}
        />
      )}
    </View>
  );
};

export default ProtectYourWallet;
