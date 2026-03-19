import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { connect, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  BoxBackgroundColor,
  BoxBorderColor,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import ActionModal from '../../UI/ActionModal';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { CHOOSE_PASSWORD_STEPS } from '../../../constants/onboarding';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import { useTheme } from '../../../util/theme';
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Routes from '../../../constants/navigation/Routes';
import { selectSeedlessOnboardingLoginFlow } from '../../../selectors/seedlessOnboardingController';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';

const explain_backup_seedphrase = require('../../../images/explain-backup-seedphrase.png'); // eslint-disable-line

const IMAGE_1_RATIO = 162.8 / 138;
const IMG_PADDING = Device.isIphoneX() ? 100 : Device.isIphone5S() ? 180 : 220;

const AccountBackupStep1B = (props) => {
  const { navigation, route } = props;
  const [showWhySecureWalletModal, setWhySecureWalletModal] = useState(false);
  const { colors } = useTheme();
  const tw = useTailwind();
  const { width: deviceWidth } = useWindowDimensions();
  const isSeedlessOnboardingLoginFlow = useSelector(
    selectSeedlessOnboardingLoginFlow,
  );

  const headerLeft = useCallback(() => <Box />, []);
  const track = (event, properties) => {
    const eventBuilder = MetricsEventBuilder.createEventBuilder(event);
    eventBuilder.addProperties(properties);
    trackOnboarding(eventBuilder.build(), props.saveOnboardingEvent);
  };

  useEffect(() => {
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft,
        },
        colors,
      ),
    );
  }, [navigation, route, colors, headerLeft]);

  const goNext = () => {
    props.navigation.navigate('ManualBackupStep1', {
      ...props.route.params,
      settingsBackup: true,
    });
    track(MetaMetricsEvents.WALLET_SECURITY_MANUAL_BACKUP_INITIATED, {});
  };

  const learnMore = () => {
    setWhySecureWalletModal(false);
    props.navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/privacy-and-security/basic-safety-and-security-tips-for-metamask/',
        title: strings('drawer.metamask_support'),
      },
    });
  };

  const dismiss = () => null;

  const showWhySecureWallet = () => setWhySecureWalletModal(true);
  const hideWhySecureWallet = () => setWhySecureWalletModal(false);

  const showWhatIsSeedphrase = () => {
    track(MetaMetricsEvents.SRP_DEFINITION_CLICKED, {
      location: 'account_backup_step_1b',
    });
    props.navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SEEDPHRASE_MODAL,
    });
  };

  const imgWidth = deviceWidth - IMG_PADDING;
  const imgHeight = imgWidth * IMAGE_1_RATIO;

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow')}
        style={tw.style('flex-1 bg-default')}
      >
        <Box
          twClassName="flex-1 px-5 mt-4"
          testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
        >
          <OnboardingProgress steps={CHOOSE_PASSWORD_STEPS} currentStep={1} />
          <Box alignItems={BoxAlignItems.Center} twClassName="pb-4">
            <Text twClassName="text-4xl leading-tight">🔒</Text>
            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Bold}
              twClassName="mt-4 mb-4"
            >
              {strings('account_backup_step_1B.title')}
            </Text>
            <Box twClassName="mb-4 justify-center">
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('account_backup_step_1B.subtitle_1')}{' '}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.PrimaryDefault}
                  onPress={showWhatIsSeedphrase}
                >
                  {strings('account_backup_step_1B.subtitle_2')}
                </Text>
              </Text>
            </Box>
            <TouchableOpacity
              onPress={showWhySecureWallet}
              style={tw.style('flex-row justify-center items-center')}
            >
              <Icon
                name="info-circle"
                style={tw.style('text-sm mr-1.5')}
                color={colors.primary.default}
              />
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.PrimaryDefault}
              >
                {strings('account_backup_step_1B.why_important')}
              </Text>
            </TouchableOpacity>
          </Box>
          <Box
            backgroundColor={BoxBackgroundColor.BackgroundDefault}
            borderWidth={1}
            borderColor={BoxBorderColor.BorderDefault}
            twClassName="rounded-xl p-4 mb-5"
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Bold}
              twClassName="mb-2 leading-4"
            >
              {strings('account_backup_step_1B.manual_title')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4 mb-5"
            >
              {strings('account_backup_step_1B.manual_subtitle')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4 mb-2"
            >
              {strings('account_backup_step_1B.manual_security')}
            </Text>
            <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-5">
              <Box twClassName="w-8 h-1.5 bg-primary-default mr-0.5" />
              <Box twClassName="w-8 h-1.5 bg-primary-default mr-0.5" />
              <Box twClassName="w-8 h-1.5 bg-primary-default mr-0.5" />
            </Box>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4"
            >
              {strings('account_backup_step_1B.risks_title')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4"
            >
              • {strings('account_backup_step_1B.risks_1')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4"
            >
              • {strings('account_backup_step_1B.risks_2')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4 mb-5"
            >
              • {strings('account_backup_step_1B.risks_3')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4 mb-5"
            >
              {strings('account_backup_step_1B.other_options')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4"
            >
              {strings('account_backup_step_1B.tips_title')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4"
            >
              • {strings('account_backup_step_1B.tips_1')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4"
            >
              • {strings('account_backup_step_1B.tips_2')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-4 mb-5"
            >
              • {strings('account_backup_step_1B.tips_3')}
            </Text>

            <Button
              variant={ButtonVariants.Primary}
              onPress={goNext}
              label={strings('account_backup_step_1B.cta_text')}
              width={ButtonWidthTypes.Full}
              size={ButtonSize.Lg}
            />
          </Box>
        </Box>
      </ScrollView>
      {Device.isAndroid() && <AndroidBackHandler customBackPress={dismiss} />}
      <ActionModal
        modalVisible={
          showWhySecureWalletModal && !isSeedlessOnboardingLoginFlow
        }
        actionContainerStyle={tw.style('border-t-0')}
        displayConfirmButton={false}
        displayCancelButton={false}
        onRequestClose={hideWhySecureWallet}
      >
        <Box twClassName="flex-1 p-7">
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Center}
            alignItems={BoxAlignItems.Center}
            twClassName="mb-4"
          >
            <Box twClassName="w-7" />
            <Text
              variant={TextVariant.HeadingMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Bold}
              twClassName="flex-1 text-center"
            >
              {strings('account_backup_step_1B.why_secure_title')}
            </Text>
            <TouchableOpacity
              onPress={hideWhySecureWallet}
              style={tw.style('p-1 items-end')}
              hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
            >
              <Icon
                name="times"
                style={tw.style('text-base')}
                color={colors.text.default}
              />
            </TouchableOpacity>
          </Box>
          <Box alignItems={BoxAlignItems.Center}>
            <Image
              source={explain_backup_seedphrase}
              style={tw.style(
                `w-[${imgWidth}px] h-[${imgHeight}px] mt-3.5 mb-2`,
              )}
              resizeMethod={'auto'}
              testID={'carousel-one-image'}
            />
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              twClassName="text-center leading-5"
            >
              {strings('account_backup_step_1B.why_secure_1')}
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
              >
                {strings('account_backup_step_1B.why_secure_2')}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={learnMore}
              hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.PrimaryDefault}
                twClassName="mt-5 text-center leading-5"
              >
                {strings('account_backup_step_1B.learn_more')}
              </Text>
            </TouchableOpacity>
          </Box>
        </Box>
      </ActionModal>
    </SafeAreaView>
  );
};

AccountBackupStep1B.propTypes = {
  /**
   * Object that represents the navigator
   */
  navigation: PropTypes.object,
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

export default connect(null, mapDispatchToProps)(AccountBackupStep1B);
