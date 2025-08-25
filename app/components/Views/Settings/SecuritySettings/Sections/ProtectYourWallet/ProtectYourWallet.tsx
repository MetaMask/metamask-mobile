import React from 'react';
import { View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
import { hasMultipleHDKeyrings } from '../../../../../../selectors/keyringController';
import {
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessOnboardingLoginFlow,
} from '../../../../../../selectors/seedlessOnboardingController';
import { capitalize } from '../../../../../../util/general';

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
  const shouldShowSRPList = useSelector(hasMultipleHDKeyrings);
  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);

  const openSRPQuiz = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
    });
  };

  const openSRPList = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
      )
        .addProperties({
          button_type: 'picker',
        })
        .build(),
    );
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SELECT_SRP,
    });
  };

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
    if (shouldShowSRPList) {
      openSRPList();
      return;
    }
    openSRPQuiz();
  };

  let oauthFlow = false;
  oauthFlow = !!useSelector(selectSeedlessOnboardingLoginFlow);
  const onProtectYourWalletPressed = () => {
    navigation.navigate('WalletRecovery');
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
        {strings('app_settings.protect_desc')}
        {!oauthFlow && !srpBackedup ? (
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Primary}
            onPress={() => Linking.openURL(LEARN_MORE_URL)}
          >
            {' '}
            {strings('app_settings.learn_more')}
          </Text>
        ) : (
          '.'
        )}
      </Text>

      {!oauthFlow &&
        (srpBackedup ? (
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
        ))}

      {!oauthFlow &&
        (!srpBackedup ? (
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
        ))}
      {oauthFlow && authConnection && (
        <Banner
          variant={BannerVariant.Alert}
          severity={BannerAlertSeverity.Success}
          title={strings('app_settings.banner_social_login_enabled', {
            authConnection: capitalize(authConnection),
          })}
          style={styles.accessory}
        />
      )}
      {oauthFlow && (
        <Button
          label={strings('app_settings.manage_recovery_method')}
          width={ButtonWidthTypes.Full}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={onProtectYourWalletPressed}
          style={styles.accessory}
          testID={SecurityPrivacyViewSelectorsIDs.PROTECT_YOUR_WALLET}
        />
      )}
    </View>
  );
};

export default ProtectYourWallet;
