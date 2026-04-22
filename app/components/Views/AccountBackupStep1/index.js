import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  BackHandler,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import Engine from '../../../core/Engine';
import { connect } from 'react-redux';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useTheme } from '../../../util/theme';
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import Routes from '../../../constants/navigation/Routes';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import SRPDesignLight from '../../../images/secure_wallet_light.png';
import SRPDesignDark from '../../../images/secure_wallet_dark.png';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useMetrics } from '../../hooks/useMetrics';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../constants/onboarding';
import { TraceName, endTrace } from '../../../util/trace';
import { AppThemeKey } from '../../../util/theme/models';

const AccountBackupStep1 = (props) => {
  const [hasFunds, setHasFunds] = useState(false);
  const { themeAppearance } = useTheme();
  const { isEnabled: isMetricsEnabled } = useMetrics();
  const tw = useTailwind();

  const track = (event, properties) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build(), props.saveOnboardingEvent);
  };

  const navigation = useNavigation();

  useEffect(
    () => {
      if (Engine.hasFunds()) setHasFunds(true);

      const hardwareBackPress = () => true;
      BackHandler.addEventListener('hardwareBackPress', hardwareBackPress);

      // Add event listener
      const backHandlerSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        hardwareBackPress,
      );

      // Remove event listener on cleanup
      return () => {
        backHandlerSubscription.remove();
      };
    },
    [], // Run only when component mounts
  );

  const goNext = () => {
    navigation.navigate('ManualBackupStep1', {
      ...props.route.params,
    });
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
        accountType: AccountType.Metamask,
      });
    }
  };

  const showRemindLater = () => {
    if (hasFunds) return;

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SKIP_ACCOUNT_SECURITY_MODAL,
      params: {
        onConfirm: skip,
        onCancel: () => {
          track(MetaMetricsEvents.WALLET_SECURITY_SKIP_CANCELED);
          goNext();
        },
      },
    });
    track(MetaMetricsEvents.WALLET_SECURITY_SKIP_INITIATED);
  };

  const showWhatIsSeedphrase = () => {
    track(MetaMetricsEvents.SRP_DEFINITION_CLICKED, {
      location: 'account_backup_step_1',
    });
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SEEDPHRASE_MODAL,
    });
  };

  return (
    <SafeAreaView
      style={tw.style(
        'flex-1 bg-default',
        Platform.OS === 'android'
          ? `pt-[${StatusBar.currentHeight || 24}px]`
          : 'pt-2',
      )}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={tw.style('flex-grow')}
        style={tw.style(
          'flex-1 bg-default',
          Platform.OS === 'android'
            ? `pt-[${StatusBar.currentHeight || 24}px]`
            : 'pt-2',
        )}
        testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
      >
        <Box twClassName="flex-1 px-4">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('manual_backup_step_1.steps', {
              currentStep: 2,
              totalSteps: 3,
            })}
          </Text>
          <Box alignItems={BoxAlignItems.Center} twClassName="flex-1 mb-2.5">
            <Text
              variant={TextVariant.DisplayMd}
              color={TextColor.TextDefault}
              twClassName="text-left self-start mb-4"
            >
              {strings('account_backup_step_1.title')}
            </Text>
            <Image
              source={
                themeAppearance === AppThemeKey.dark
                  ? SRPDesignDark
                  : SRPDesignLight
              }
              style={tw.style('w-[250px] h-[250px] mx-auto')}
            />
            <Box twClassName="mt-8 self-start gap-y-4">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('account_backup_step_1.info_text_1_1')}{' '}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.PrimaryDefault}
                  onPress={showWhatIsSeedphrase}
                  testID={ManualBackUpStepsSelectorsIDs.SEEDPHRASE_LINK}
                >
                  {strings('account_backup_step_1.info_text_1_2')}
                </Text>{' '}
                {strings('account_backup_step_1.info_text_1_3')}{' '}
              </Text>

              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('account_backup_step_1.info_text_1_4')}
              </Text>
            </Box>
          </Box>

          <Box
            justifyContent={BoxJustifyContent.FlexEnd}
            twClassName={`mt-auto gap-y-4 ${
              Platform.OS === 'android' ? 'mb-6' : 'mb-4'
            }`}
          >
            <Button
              variant={ButtonVariant.Primary}
              onPress={goNext}
              isFullWidth
              size={ButtonSize.Lg}
            >
              {strings('account_backup_step_1.cta_text')}
            </Button>
            {!hasFunds && (
              <Button
                variant={ButtonVariant.Secondary}
                onPress={showRemindLater}
                isFullWidth
                size={ButtonSize.Lg}
                testID={ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON}
              >
                {strings('account_backup_step_1.remind_me_later')}
              </Button>
            )}
          </Box>
        </Box>
      </ScrollView>
      {Device.isAndroid() && (
        <AndroidBackHandler customBackPress={showRemindLater} />
      )}
    </SafeAreaView>
  );
};

const mapDispatchToProps = (dispatch) => ({
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
});

AccountBackupStep1.propTypes = {
  /**
   * Object that represents the current route info like params passed to it.
   */
  route: PropTypes.object,
  /**
   * Action to save onboarding event.
   */
  saveOnboardingEvent: PropTypes.func,
};

export default connect(null, mapDispatchToProps)(AccountBackupStep1);
