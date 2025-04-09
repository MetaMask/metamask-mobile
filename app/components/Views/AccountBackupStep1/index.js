import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  View,
  SafeAreaView,
  StyleSheet,
  BackHandler,
  Image,
} from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles, colors as importedColors } from '../../../styles/common';
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
import { connect } from 'react-redux';
import setOnboardingWizardStep from '../../../actions/wizard';
import { MetaMetricsEvents } from '../../../core/Analytics';

import StorageWrapper from '../../../store/storage-wrapper';
import { useTheme } from '../../../util/theme';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import Routes from '../../../../app/constants/navigation/Routes';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import SRPDesign from '../../../images/srp-lock-design.png';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';

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
      // marginTop: 16,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      flex: 1,
      marginBottom: 10,
    },
    title: {
      fontSize: 32,
      marginBottom: 8,
      marginTop: 0,
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.bold,
      alignSelf: 'flex-start',
    },
    text: {
      marginTop: 32,
      justifyContent: 'center',
      alignSelf: 'flex-start',
      flexDirection: 'column',
      rowGap: 16,
    },
    label: {
      lineHeight: scaling.scale(20),
      fontSize: scaling.scale(14),
      color: colors.text.default,
      textAlign: 'left',
      ...fontStyles.normal,
    },
    buttonWrapper: {
      flex: 1,
      justifyContent: 'flex-end',
      flexDirection: 'column',
      rowGap: 16,
    },
    bold: {
      ...fontStyles.bold,
    },
    blue: {
      color: importedColors.primaryDefault,
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
    srpDesign: {
      width: 200,
      height: 225,
      marginHorizontal: 'auto',
    },
    button: {
      width: '100%',
      backgroundColor: importedColors.primaryDefault,
    },
    step: {
      fontSize: 14,
      color: importedColors.textAlternative,
      ...fontStyles.normal,
      marginTop: 16,
      marginBottom: 6,
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

  const track = (event, properties) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build());
  };

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
    props.navigation.navigate('ManualBackupStep1', { ...props.route.params });
    track(MetaMetricsEvents.WALLET_SECURITY_STARTED);
  };

  const showRemindLater = () => {
    if (hasFunds) return;

    setRemindLaterModal(true);
    track(MetaMetricsEvents.WALLET_SECURITY_SKIP_INITIATED);
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
    track(MetaMetricsEvents.WALLET_SECURITY_SKIP_CONFIRMED);
    // Get onboarding wizard state
    const onboardingWizard = await StorageWrapper.getItem(ONBOARDING_WIZARD);
    !onboardingWizard && props.setOnboardingWizardStep(1);
    props.navigation.reset({
      index: 1,
      routes: [{ name: Routes.ONBOARDING.SUCCESS }],
    });
  };

  const showWhatIsSeedphrase = () => setWhatIsSeedphraseModal(true);

  const hideWhatIsSeedphrase = () => setWhatIsSeedphraseModal(false);

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <ScrollView
        contentContainerStyle={styles.scrollviewWrapper}
        style={styles.mainWrapper}
        testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
      >
        <View style={styles.wrapper}>
          <Text style={styles.step}>Step 2 of 3</Text>
          {/* <OnboardingProgress steps={CHOOSE_PASSWORD_STEPS} currentStep={1} /> */}
          <View style={styles.content}>
            <Text style={styles.title}>
              {strings('account_backup_step_1.title')}
            </Text>
            <Image source={SRPDesign} style={styles.srpDesign} />
            <View style={styles.text}>
              <Text style={styles.label}>
                {strings('account_backup_step_1.info_text_1_1')}{' '}
                <Button
                  variant={ButtonVariants.Link}
                  onPress={showWhatIsSeedphrase}
                  label={strings('account_backup_step_1.info_text_1_2')}
                />{' '}
                {strings('account_backup_step_1.info_text_1_3')}{' '}
              </Text>

              <Text style={styles.label}>
                {strings('account_backup_step_1.info_text_1_4')}
              </Text>
            </View>
          </View>

          <View style={styles.buttonWrapper}>
            <View>
              <Button
                variant={ButtonVariants.Primary}
                onPress={goNext}
                label={strings('account_backup_step_1.cta_text')}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
              />
            </View>
            {!hasFunds && (
              <View>
                <Button
                  variant={ButtonVariants.Secondary}
                  onPress={showRemindLater}
                  label={strings('account_backup_step_1.remind_me_later')}
                  width={ButtonWidthTypes.Full}
                  size={ButtonSize.Lg}
                />
              </View>
              // <View style={styles.remindLaterContainer}>
              //   <StyledButton
              //     style={styles.remindLaterButton}
              //     onPress={showRemindLater}
              //     hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
              //   >
              //     {strings('account_backup_step_1.remind_me_later')}
              //   </StyledButton>
              //   {/* <Text style={styles.remindLaterSubText}>
              //         {strings('account_backup_step_1.remind_me_later_subtext')}
              //       </Text> */}
              // </View>
            )}
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
