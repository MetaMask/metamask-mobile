/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
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
  Text as DSText,
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
const DEVICE_WIDTH = Dimensions.get('window').width;
const IMG_PADDING = Device.isIphoneX() ? 100 : Device.isIphone5S() ? 180 : 220;

const AccountBackupStep1B = (props) => {
  const { navigation, route } = props;
  const [showWhySecureWalletModal, setWhySecureWalletModal] = useState(false);
  const { colors } = useTheme();
  const tw = useTailwind();
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

  const imgWidth = DEVICE_WIDTH - IMG_PADDING;
  const imgHeight = imgWidth * IMAGE_1_RATIO;

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <ScrollView
        contentContainerStyle={tw.style('flex-grow')}
        style={tw.style('flex-1 bg-default')}
      >
        <Box
          twClassName="flex-1 p-5 pt-0 pb-0 mt-4"
          testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
        >
          <OnboardingProgress steps={CHOOSE_PASSWORD_STEPS} currentStep={1} />
          <Box alignItems={BoxAlignItems.Center} twClassName="pb-4">
            <DSText twClassName="text-[32px] leading-[44px]">🔒</DSText>
            <DSText
              variant={TextVariant.HeadingLg}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Bold}
              twClassName="ml-0 mt-4 mb-4"
            >
              {strings('account_backup_step_1B.title')}
            </DSText>
            <Box twClassName="mb-4 justify-center">
              <DSText
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
              >
                {strings('account_backup_step_1B.subtitle_1')}{' '}
                <DSText
                  variant={TextVariant.BodyMd}
                  color={TextColor.PrimaryDefault}
                  onPress={showWhatIsSeedphrase}
                >
                  {strings('account_backup_step_1B.subtitle_2')}
                </DSText>
              </DSText>
            </Box>
            <TouchableOpacity
              onPress={showWhySecureWallet}
              style={tw.style('flex-row justify-center items-center')}
            >
              <Icon
                name="info-circle"
                style={tw.style('text-[15px] mr-1.5')}
                color={colors.primary.default}
              />
              <DSText
                variant={TextVariant.BodySm}
                color={TextColor.PrimaryDefault}
              >
                {strings('account_backup_step_1B.why_important')}
              </DSText>
            </TouchableOpacity>
          </Box>
          <Box
            backgroundColor={BoxBackgroundColor.BackgroundDefault}
            borderWidth={1}
            borderColor={BoxBorderColor.BorderDefault}
            twClassName="rounded-[10px] p-4 mb-5"
          >
            <DSText
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Bold}
              twClassName="mb-2 leading-[17px]"
            >
              {strings('account_backup_step_1B.manual_title')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px] mb-5"
            >
              {strings('account_backup_step_1B.manual_subtitle')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px] mb-2"
            >
              {strings('account_backup_step_1B.manual_security')}
            </DSText>
            <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-5">
              <Box twClassName="w-8 h-1.5 bg-primary-default mr-0.5" />
              <Box twClassName="w-8 h-1.5 bg-primary-default mr-0.5" />
              <Box twClassName="w-8 h-1.5 bg-primary-default mr-0.5" />
            </Box>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px]"
            >
              {strings('account_backup_step_1B.risks_title')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px]"
            >
              • {strings('account_backup_step_1B.risks_1')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px]"
            >
              • {strings('account_backup_step_1B.risks_2')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px] mb-5"
            >
              • {strings('account_backup_step_1B.risks_3')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px] mb-5"
            >
              {strings('account_backup_step_1B.other_options')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px]"
            >
              {strings('account_backup_step_1B.tips_title')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px]"
            >
              • {strings('account_backup_step_1B.tips_1')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px]"
            >
              • {strings('account_backup_step_1B.tips_2')}
            </DSText>
            <DSText
              variant={TextVariant.BodyXs}
              color={TextColor.TextDefault}
              twClassName="leading-[17px] mb-5"
            >
              • {strings('account_backup_step_1B.tips_3')}
            </DSText>

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
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="flex-1 p-[27px]"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Center}
            alignItems={BoxAlignItems.Center}
            twClassName="mb-4"
          >
            <Box twClassName="w-[26px]" />
            <DSText
              variant={TextVariant.HeadingMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Bold}
              twClassName="flex-1 text-center"
            >
              {strings('account_backup_step_1B.why_secure_title')}
            </DSText>
            <TouchableOpacity
              onPress={hideWhySecureWallet}
              style={tw.style('p-[5px] items-end')}
              hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
            >
              <Icon
                name="times"
                style={tw.style('text-[16px]')}
                color={colors.text.default}
              />
            </TouchableOpacity>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
          >
            <Image
              source={explain_backup_seedphrase}
              style={tw.style(
                `w-[${imgWidth}px] h-[${imgHeight}px] mt-3.5 mb-2`,
              )}
              resizeMethod={'auto'}
              testID={'carousel-one-image'}
            />
            <DSText
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              twClassName="text-center leading-5"
            >
              {strings('account_backup_step_1B.why_secure_1')}
              <DSText
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
              >
                {strings('account_backup_step_1B.why_secure_2')}
              </DSText>
            </DSText>
            <TouchableOpacity
              onPress={learnMore}
              hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
            >
              <DSText
                variant={TextVariant.BodyMd}
                color={TextColor.PrimaryDefault}
                twClassName="mt-[21px] text-center leading-5"
              >
                {strings('account_backup_step_1B.learn_more')}
              </DSText>
            </TouchableOpacity>
          </Box>
        </Box>
      </ActionModal>
    </SafeAreaView>
  );
};

const mapDispatchToProps = (dispatch) => ({
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(AccountBackupStep1B);
