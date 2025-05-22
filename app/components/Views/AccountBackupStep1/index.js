import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  SafeAreaView,
  StyleSheet,
  BackHandler,
  Image,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import scaling from '../../../util/scaling';
import Engine from '../../../core/Engine';
import { ONBOARDING_WIZARD } from '../../../constants/storage';
import { connect } from 'react-redux';
import setOnboardingWizardStep from '../../../actions/wizard';
import { MetaMetricsEvents } from '../../../core/Analytics';
import StorageWrapper from '../../../store/storage-wrapper';
import { useTheme } from '../../../util/theme';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import Routes from '../../../../app/constants/navigation/Routes';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import SRPDesign from '../../../images/secure_wallet.png';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { TraceName, bufferedEndTrace } from '../../../util/trace';
import { useMetrics } from '../../hooks/useMetrics';

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
      paddingHorizontal: 16,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      flex: 1,
      marginBottom: 10,
    },
    title: {
      textAlign: 'left',
      alignSelf: 'flex-start',
      marginBottom: 16,
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
      marginBottom: 16,
    },
    srpDesign: {
      width: 250,
      height: 250,
      marginHorizontal: 'auto',
    },
    headerLeft: {
      marginLeft: 16,
    },
  });

/**
 * View that's shown during the first step of
 * the backup seed phrase flow
 */
const AccountBackupStep1 = (props) => {
  const { navigation, route } = props;
  const [hasFunds, setHasFunds] = useState(false);
  const { colors } = useTheme();
  const { isEnabled: isMetricsEnabled } = useMetrics();
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
        {
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon
                name={IconName.ArrowLeft}
                size={IconSize.Lg}
                color={colors.text.default}
                style={styles.headerLeft}
              />
            </TouchableOpacity>
          ),
        },
        colors,
        false,
      ),
      gesturesEnabled: false,
    });
  }, [navigation, route, colors, styles.headerLeft]);

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

  const skip = async () => {
    track(MetaMetricsEvents.WALLET_SECURITY_SKIP_CONFIRMED);
    // Get onboarding wizard state
    const onboardingWizard = await StorageWrapper.getItem(ONBOARDING_WIZARD);
    !onboardingWizard && props.setOnboardingWizardStep(1);

    bufferedEndTrace({ name: TraceName.OnboardingNewSrpCreateWallet });
    bufferedEndTrace({ name: TraceName.OnboardingJourneyOverall });

    if (isMetricsEnabled()) {
      props.navigation.navigate('OnboardingSuccess', {
        showPasswordHint: false,
      });
    } else {
      props.navigation.navigate('OptinMetrics', {
        onContinue: () => {
          props.navigation.navigate('OnboardingSuccess', {
          showPasswordHint: false,
        });
        },
      });
    }
  };

  const showRemindLater = () => {
    if (hasFunds) return;

    props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL,
      params: {
        onConfirm: skip,
        onCancel: goNext,
      },
    });
    track(MetaMetricsEvents.WALLET_SECURITY_SKIP_INITIATED);
  };

  const showWhatIsSeedphrase = () => {
    props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SEEDPHRASE_MODAL,
    });
  };

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <ScrollView
        contentContainerStyle={styles.scrollviewWrapper}
        style={styles.mainWrapper}
        testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
      >
        <View style={styles.wrapper}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            Step 2 of 3
          </Text>
          {/* <OnboardingProgress steps={CHOOSE_PASSWORD_STEPS} currentStep={1} /> */}
          <View style={styles.content}>
            <Text
              variant={TextVariant.DisplayMD}
              color={TextColor.Default}
              style={styles.title}
            >
              {strings('account_backup_step_1.title')}
            </Text>
            <Image source={SRPDesign} style={styles.srpDesign} />
            <View style={styles.text}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('account_backup_step_1.info_text_1_1')}{' '}
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Primary}
                  onPress={showWhatIsSeedphrase}
                >
                  {strings('account_backup_step_1.info_text_1_2')}
                </Text>{' '}
                {strings('account_backup_step_1.info_text_1_3')}{' '}
              </Text>

              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
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
            )}
          </View>
        </View>
      </ScrollView>
      {Device.isAndroid() && (
        <AndroidBackHandler customBackPress={showRemindLater} />
      )}
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
