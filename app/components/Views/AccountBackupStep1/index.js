import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  BackHandler,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import scaling from '../../../util/scaling';
import Engine from '../../../core/Engine';
import { connect } from 'react-redux';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import { MetaMetricsEvents } from '../../../core/Analytics';
import StorageWrapper from '../../../store/storage-wrapper';
import { useTheme } from '../../../util/theme';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import Routes from '../../../../app/constants/navigation/Routes';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import SRPDesignLight from '../../../images/secure_wallet_light.png';
import SRPDesignDark from '../../../images/secure_wallet_dark.png';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useMetrics } from '../../hooks/useMetrics';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';
import { TraceName, endTrace } from '../../../util/trace';
import { AppThemeKey } from '../../../util/theme/models';

const createStyles = (colors) =>
  StyleSheet.create({
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
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
      marginBottom: Platform.select({
        ios: 16,
        android: 24,
        default: 16,
      }),
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
  const [hasFunds, setHasFunds] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const { isEnabled: isMetricsEnabled } = useMetrics();

  const track = (event, properties) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build(), props.saveOnboardingEvent);
  };

  const navigation = useNavigation();

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
    navigation.navigate('ManualBackupStep1', { ...props.route.params });
    track(MetaMetricsEvents.WALLET_SECURITY_STARTED);
  };

  const skip = async () => {
    track(MetaMetricsEvents.WALLET_SECURITY_SKIP_CONFIRMED);
    const resetAction = CommonActions.reset({
      index: 1,
      routes: [
        {
          name: Routes.ONBOARDING.SUCCESS_FLOW,
          params: {
            screen: Routes.ONBOARDING.SUCCESS,
            params: {
              ...props.route.params,
              successFlow: ONBOARDING_SUCCESS_FLOW.NO_BACKED_UP_SRP,
            },
          },
        },
      ],
    });
    endTrace({ name: TraceName.OnboardingNewSrpCreateWallet });
    endTrace({ name: TraceName.OnboardingJourneyOverall });

    if (isMetricsEnabled()) {
      navigation.dispatch(resetAction);
    } else {
      navigation.navigate('OptinMetrics', {
        onContinue: () => {
          navigation.dispatch(resetAction);
        },
      });
    }
  };

  const showRemindLater = () => {
    if (hasFunds) return;

    navigation.navigate(Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL, {
      onConfirm: skip,
      onCancel: () => {
        track(MetaMetricsEvents.WALLET_SECURITY_SKIP_CANCELED);
        goNext();
      },
    });
    track(MetaMetricsEvents.WALLET_SECURITY_SKIP_INITIATED);
  };

  const showWhatIsSeedphrase = () => {
    track(MetaMetricsEvents.SRP_DEFINITION_CLICKED, {
      location: 'account_backup_step_1',
    });
    navigation.navigate(Routes.SHEET.SEEDPHRASE_MODAL);
  };

  return (
    <SafeAreaView style={styles.mainWrapper} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollviewWrapper}
        style={styles.mainWrapper}
        testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
      >
        <View style={styles.wrapper}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('manual_backup_step_1.steps', {
              currentStep: 2,
              totalSteps: 3,
            })}
          </Text>
          <View style={styles.content}>
            <Text
              variant={TextVariant.DisplayMD}
              color={TextColor.Default}
              style={styles.title}
            >
              {strings('account_backup_step_1.title')}
            </Text>
            <Image
              source={
                themeAppearance === AppThemeKey.dark
                  ? SRPDesignDark
                  : SRPDesignLight
              }
              style={styles.srpDesign}
            />
            <View style={styles.text}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('account_backup_step_1.info_text_1_1')}{' '}
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Primary}
                  onPress={showWhatIsSeedphrase}
                  testID={ManualBackUpStepsSelectorsIDs.SEEDPHRASE_LINK}
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
                  testID={ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON}
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
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
  /**
   * Action to save onboarding event
   */
  saveOnboardingEvent: PropTypes.func,
};

const mapDispatchToProps = (dispatch) => ({
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(AccountBackupStep1);
