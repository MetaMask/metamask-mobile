import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  SafeAreaView,
  StyleSheet,
  BackHandler,
  InteractionManager,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import SeedphraseModal from '../../UI/SeedphraseModal';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import scaling from '../../../util/scaling';
import Engine from '../../../core/Engine';
import { ONBOARDING_WIZARD } from '../../../constants/storage';
import { CHOOSE_PASSWORD_STEPS } from '../../../constants/onboarding';
import SkipAccountSecurityModal from '../../UI/SkipAccountSecurityModal';
import SeedPhraseVideo from '../../UI/SeedPhraseVideo';
import { connect } from 'react-redux';
import setOnboardingWizardStep from '../../../actions/wizard';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import DefaultPreference from 'react-native-default-preference';
import { useTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  PROTECT_YOUR_WALLET_CONTAINER_ID,
  REMIND_LATER_BUTTON_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/WalletSetupScreen.testIds';
const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    scrollviewWrapper: {
      flexGrow: 1,
    },
    wrapper: {
      flex: 1,
      padding: 20,
      paddingTop: 0,
      paddingBottom: 0,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      flex: 1,
      marginBottom: 10,
    },
    title: {
      fontSize: 24,
      marginBottom: 24,
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.bold,
    },
    text: {
      marginTop: 32,
      justifyContent: 'center',
    },
    label: {
      lineHeight: scaling.scale(20),
      fontSize: scaling.scale(14),
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.normal,
    },
    buttonWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    bold: {
      ...fontStyles.bold,
    },
    blue: {
      color: colors.primary.default,
    },
    remindLaterText: {
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 20,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    remindLaterSubText: {
      textAlign: 'center',
      fontSize: 11,
      lineHeight: 20,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    startSubText: {
      textAlign: 'center',
      fontSize: 11,
      marginTop: 12,
      color: colors.text.alternative,
      ...fontStyles.normal,
    },
    remindLaterContainer: {
      marginBottom: 34,
    },
    remindLaterButton: {
      elevation: 10,
      zIndex: 10,
    },
    ctaContainer: {
      marginBottom: 30,
    },
  });

/**
 * View that's shown during the first step of
 * the backup seed phrase flow
 */
const AccountBackupStep1 = (props) => {
  const { navigation, route } = props;
  const [showRemindLaterModal, setRemindLaterModal] = useState(false);
  const [showWhatIsSeedphraseModal, setWhatIsSeedphraseModal] = useState(false);
  const [skipCheckbox, setToggleSkipCheckbox] = useState(false);
  const [hasFunds, setHasFunds] = useState(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    navigation.setOptions({
      ...getOnboardingNavbarOptions(
        route,
        // eslint-disable-next-line react/display-name
        { headerLeft: () => <View /> },
        colors,
      ),
      gesturesEnabled: false,
    });
  }, [navigation, route, colors]);

  useEffect(
    () => {
      // Check if user has funds
      if (Engine.hasFunds()) setHasFunds(true);

      // Disable back press
      const hardwareBackPress = () => true;

      // Add event listener
      BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);

      // Remove event listener on cleanup
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', hardwareBackPress);
      };
    },
    [], // Run only when component mounts
  );

  const goNext = () => {
    props.navigation.navigate('AccountBackupStep1B', { ...props.route.params });
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SECURITY_STARTED);
    });
  };

  const showRemindLater = () => {
    if (hasFunds) return;

    setRemindLaterModal(true);
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SECURITY_SKIP_INITIATED);
    });
  };

  const toggleSkipCheckbox = () =>
    skipCheckbox ? setToggleSkipCheckbox(false) : setToggleSkipCheckbox(true);

  const hideRemindLaterModal = () => {
    setToggleSkipCheckbox(false);
    setRemindLaterModal(false);
  };

  const secureNow = () => {
    hideRemindLaterModal();
    goNext();
  };

  const skip = async () => {
    hideRemindLaterModal();
    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(MetaMetricsEvents.WALLET_SECURITY_SKIP_CONFIRMED);
    });
    // Get onboarding wizard state
    const onboardingWizard = await DefaultPreference.get(ONBOARDING_WIZARD);
    if (onboardingWizard) {
      props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
    } else {
      props.setOnboardingWizardStep(1);
      props.navigation.reset({ routes: [{ name: 'HomeNav' }] });
    }
  };

  const showWhatIsSeedphrase = () => setWhatIsSeedphraseModal(true);

  const hideWhatIsSeedphrase = () => setWhatIsSeedphraseModal(false);

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <ScrollView
        contentContainerStyle={styles.scrollviewWrapper}
        style={styles.mainWrapper}
        testID={'account-backup-step-1-screen'}
      >
        <View
          style={styles.wrapper}
          {...generateTestId(Platform, PROTECT_YOUR_WALLET_CONTAINER_ID)}
        >
          <OnboardingProgress steps={CHOOSE_PASSWORD_STEPS} currentStep={1} />
          <View style={styles.content}>
            <Text style={styles.title}>
              {strings('account_backup_step_1.title')}
            </Text>
            <SeedPhraseVideo onClose={skip} />
            <View style={styles.text}>
              <Text style={styles.label}>
                {strings('account_backup_step_1.info_text_1_1')}{' '}
                <Text style={styles.blue} onPress={showWhatIsSeedphrase}>
                  {strings('account_backup_step_1.info_text_1_2')}
                </Text>{' '}
                {strings('account_backup_step_1.info_text_1_3')}{' '}
                <Text style={styles.bold}>
                  {strings('account_backup_step_1.info_text_1_4')}
                </Text>
              </Text>
            </View>
          </View>
          <View style={styles.buttonWrapper}>
            {!hasFunds && (
              <View style={styles.remindLaterContainer}>
                <TouchableOpacity
                  style={styles.remindLaterButton}
                  onPress={showRemindLater}
                  hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
                >
                  <Text
                    style={styles.remindLaterText}
                    {...generateTestId(Platform, REMIND_LATER_BUTTON_ID)}
                  >
                    {strings('account_backup_step_1.remind_me_later')}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.remindLaterSubText}>
                  {strings('account_backup_step_1.remind_me_later_subtext')}
                </Text>
              </View>
            )}
            <View style={styles.ctaContainer}>
              <StyledButton
                containerStyle={styles.button}
                type={'confirm'}
                onPress={goNext}
                testID={'submit-button'}
              >
                {strings('account_backup_step_1.cta_text')}
              </StyledButton>
              <Text style={styles.startSubText}>
                {strings('account_backup_step_1.cta_subText')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      {Device.isAndroid() && (
        <AndroidBackHandler customBackPress={showRemindLater} />
      )}
      <SkipAccountSecurityModal
        modalVisible={showRemindLaterModal}
        onCancel={secureNow}
        onConfirm={skip}
        skipCheckbox={skipCheckbox}
        onPress={hideRemindLaterModal}
        toggleSkipCheckbox={toggleSkipCheckbox}
      />
      <SeedphraseModal
        showWhatIsSeedphraseModal={showWhatIsSeedphraseModal}
        hideWhatIsSeedphrase={hideWhatIsSeedphrase}
      />
    </SafeAreaView>
  );
};

AccountBackupStep1.propTypes = {
  /**
  /* navigation object required to push and pop other views
  */
  navigation: PropTypes.object,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
  /**
   * Action to set onboarding wizard step
   */
  setOnboardingWizardStep: PropTypes.func,
};

const mapDispatchToProps = (dispatch) => ({
  setOnboardingWizardStep: (step) => dispatch(setOnboardingWizardStep(step)),
});

export default connect(null, mapDispatchToProps)(AccountBackupStep1);
