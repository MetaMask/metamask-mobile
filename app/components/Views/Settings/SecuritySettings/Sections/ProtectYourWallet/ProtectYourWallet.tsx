import React from 'react';
import { View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
import { useSelector } from 'react-redux';
///: END:ONLY_INCLUDE_IF
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import { LEARN_MORE_URL } from '../../../../../../constants/urls';
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';
import { createStyles } from './styles';
import Routes from '../../../../../../constants/navigation/Routes';
import Banner, {
  BannerVariant,
  BannerAlertSeverity,
} from '../../../../../../component-library/components/Banners/Banner';
import { useMetrics } from '../../../../../../components/hooks/useMetrics';
///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
import { hasMultipleHDKeyrings } from '../../../../../../selectors/keyringController';
///: END:ONLY_INCLUDE_IF

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
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
  const shouldShowSRPList = useSelector(hasMultipleHDKeyrings);
  ///: END:ONLY_INCLUDE_IF

  const openSRPQuiz = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
    });
  };

  ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
  const openSRPList = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SELECT_SRP,
    });
  };
  ///: END:ONLY_INCLUDE_IF

  const goToBackup = (): void => {
    navigation.navigate(Routes.ACCOUNT_BACKUP.STEP_1_B);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_SECURITY_STARTED)
        .addProperties({
          source: 'Settings',
        })
        .build(),
    );
  };

  const onRevealPressed = () => {
    ///: BEGIN:ONLY_INCLUDE_IF(multi-srp)
    if (shouldShowSRPList) {
      openSRPList();
      return;
    }
    ///: END:ONLY_INCLUDE_IF
    openSRPQuiz();
  };

  return (
    <View style={[styles.setting, styles.firstSetting]}>
      <Text variant={TextVariant.BodyLGMedium}>
        {strings('app_settings.protect_title')}
      </Text>

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
      {srpBackedup ? (
        <Banner
          variant={BannerVariant.Alert}
          severity={BannerAlertSeverity.Success}
          title={strings('app_settings.seedphrase_backed_up')}
          description={
            hintText ? (
              <Button
                variant={ButtonVariants.Link}
                style={styles.viewHint}
                onPress={toggleHint}
                label={strings('app_settings.view_hint')}
              />
            ) : null
          }
          style={styles.accessory}
        />
      ) : (
        <Banner
          variant={BannerVariant.Alert}
          severity={BannerAlertSeverity.Error}
          title={strings('app_settings.seedphrase_not_backed_up')}
          style={styles.accessory}
        />
      )}
      {!srpBackedup ? (
        <Button
          label={strings('app_settings.back_up_now')}
          width={ButtonWidthTypes.Full}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={goToBackup}
          style={styles.accessory}
        />
      ) : (
        <Button
          label={strings('reveal_credential.seed_phrase_title')}
          width={ButtonWidthTypes.Full}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={onRevealPressed}
          style={styles.accessory}
          testID={SecurityPrivacyViewSelectorsIDs.REVEAL_SEED_BUTTON}
        />
      )}
    </View>
  );
};

export default ProtectYourWallet;
