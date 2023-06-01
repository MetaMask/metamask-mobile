// Third party dependencies.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../../../component-library/components/Sheet/SheetBottom';
import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../Base/Text';
import { useTheme } from '../../../../../util/theme';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Engine from '../../../../../core/Engine';
import { tlc } from '../../../../../util/general';
import generateTestId from '../../../../../../wdio/utils/generateTestId';
import TextField from '../../../../../component-library/components/Form/TextField';
import Checkbox from '../../../../../component-library/components/Checkbox';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import AppConstants from '../../../../../core/AppConstants';
import { trackEventV2 as trackEvent } from '../../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

// Internal dependencies
import createStyles from './EthSignFriction.styles';
import { ETH_SIGN_FRICTION_TEXTFIELD_TEST_ID } from './EthSignFriction.testIds';

/**
 * EthSignFriction Component.
 *
 * This component is used to show the friction bottomSheet for enabling eth_sign advanced setting.
 * The friction is divided into two steps:
 * - The first step is to show the user the risk of enabling eth_sign and requires a checkbox to continue.
 * - The second step is to ask the user to type a specific text to confirm that they understand the risk and allow them to enable eth_sign.
 */
const EthSignFriction = () => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const sheetRef = useRef<SheetBottomRef>(null);
  const [understandCheckbox, setUnderstandCheckbox] = useState(false);
  const [firstFrictionPassed, setFirstFrictionPassed] = useState(false);
  const [approveText, setApproveText] = useState<string>('');
  const navigation = useNavigation();

  // Track the view of the friction steps.
  useEffect(() => {
    if (!firstFrictionPassed) {
      trackEvent(
        MetaMetricsEvents.SETTINGS_ADVANCED_ETH_SIGN_FRICTION_FIRST_STEP_VIEWED,
        {},
      );
    } else {
      trackEvent(
        MetaMetricsEvents.SETTINGS_ADVANCED_ETH_SIGN_FRICTION_SECOND_STEP_VIEWED,
        {},
      );
    }
  }, [firstFrictionPassed]);

  // friction element status checks.
  const isApproveTextMatched = (text: string) =>
    tlc(text) === tlc(strings('app_settings.toggleEthSignModalFormValidation'));
  const isFirstStepReadyToContinue = useMemo(
    () => understandCheckbox && !firstFrictionPassed,
    [understandCheckbox, firstFrictionPassed],
  );
  const isSecondStepReadyToEnable = useMemo(
    () => firstFrictionPassed && isApproveTextMatched(approveText),
    [firstFrictionPassed, approveText],
  );
  const isPrimaryButtonDisabled = useMemo(
    () => !(isFirstStepReadyToContinue || isSecondStepReadyToEnable),
    [isFirstStepReadyToContinue, isSecondStepReadyToEnable],
  );

  // invert the current checkbox value: enabled -> disabled, disabled -> enabled.
  const toggleUnderstandCheckbox = () =>
    setUnderstandCheckbox(!understandCheckbox);

  // show a webview with the support page about eth_sign.
  const onLearnMorePress = () => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.WHAT_IS_ETH_SIGN_AND_WHY_IS_IT_A_RISK,
        title: strings('app_settings.enable_eth_sign'),
      },
    });
  };

  const onCancelPress = () => {
    sheetRef.current?.hide();
  };

  const onPrimaryPress = () => {
    if (isFirstStepReadyToContinue) {
      // when the user presses the primary "continue" button for the first step,
      // we mark first step as passed, and it shows the second friction step.
      setFirstFrictionPassed(true);
    } else if (isSecondStepReadyToEnable) {
      // when the user presses the primary "enable" button for the second step,
      // we enable the eth_sign advanced setting and hide the bottomSheet.
      const { PreferencesController } = Engine.context;
      PreferencesController.setDisabledRpcMethodPreference('eth_sign', true);
      trackEvent(MetaMetricsEvents.SETTINGS_ADVANCED_ETH_SIGN_ENABLED, {});
      sheetRef.current?.hide();
    }
  };

  return (
    <SheetBottom ref={sheetRef}>
      <View style={styles.frictionContainer}>
        {/*Common explanation content for both steps*/}
        <Icon
          style={styles.warningIcon}
          color={colors.error.default}
          name={IconName.Danger}
          size={IconSize.Xl}
        />
        <Text style={styles.heading}>
          {strings('app_settings.toggleEthSignModalTitle')}
        </Text>
        <Text>
          <Text>{strings('app_settings.toggleEthSignModalDescription')} </Text>
          <Text
            primary
            noMargin
            link
            accessibilityRole={'link'}
            onPress={onLearnMorePress}
          >
            {strings('app_settings.toggleEthSignModalLearnMore')}
          </Text>
        </Text>
        <View style={styles.warning}>
          <Icon
            style={styles.warningIcon}
            color={colors.error.default}
            name={IconName.Danger}
            size={IconSize.Lg}
          />
          <Text style={styles.warningText}>
            <Text>{strings('app_settings.toggleEthSignModalBannerText')}</Text>
            <Text style={styles.bold}>
              {strings('app_settings.toggleEthSignModalBannerBoldText')}
            </Text>
          </Text>
        </View>
        {!firstFrictionPassed ? (
          // First step checkbox content
          <View style={styles.understandCheckboxView}>
            <Checkbox
              isChecked={understandCheckbox}
              style={styles.understandCheckbox}
              onPress={toggleUnderstandCheckbox}
              accessibilityRole={'checkbox'}
            />
            <Text
              onPress={() => toggleUnderstandCheckbox()}
              style={styles.understandCheckText}
            >
              {strings('app_settings.toggleEthSignModalCheckBox')}
            </Text>
          </View>
        ) : (
          // Second step textfield content
          <View style={styles.areYouSure}>
            <Text style={[styles.textConfirmField, styles.bold]}>
              {strings('app_settings.toggleEthSignModalFormLabel')}
            </Text>
            <TextField
              contextMenuHidden
              autoCompleteType={'off'}
              autoCorrect={false}
              isError={approveText.length > 0 && isPrimaryButtonDisabled}
              returnKeyType={'done'}
              onEndEditing={(e) => setApproveText(e.nativeEvent.text)}
              autoCapitalize="none"
              onFocus={() => setApproveText('')}
              keyboardAppearance={themeAppearance}
              {...generateTestId(Platform, ETH_SIGN_FRICTION_TEXTFIELD_TEST_ID)}
            />
            {approveText.length > 0 && isPrimaryButtonDisabled && (
              <Text style={[styles.red, styles.textConfirmWarningText]}>
                {strings('app_settings.toggleEthSignModalFormError')}
              </Text>
            )}
          </View>
        )}
        {/*Common action buttons for both steps*/}
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            label={strings('navigation.cancel')}
            onPress={onCancelPress}
            style={styles.buttonStart}
            accessibilityRole={'button'}
          />

          <Button
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            isDanger={firstFrictionPassed}
            label={strings(
              firstFrictionPassed
                ? 'app_settings.toggleEthSignEnableButton'
                : 'app_settings.toggleEthSignContinueButton',
            )}
            onPress={onPrimaryPress}
            isDisabled={isPrimaryButtonDisabled}
            style={styles.buttonEnd}
            accessibilityRole={'button'}
          />
        </View>
      </View>
    </SheetBottom>
  );
};

export default EthSignFriction;
