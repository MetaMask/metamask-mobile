// Third party dependencies.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

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

// Internal dependencies
import createStyles from './EthSignFriction.styles';
import { ETH_SIGN_FRICTION_TEXTFIELD_TEST_ID } from './EthSignFriction.testIds';
import Checkbox from '../../../../../component-library/components/Checkbox';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import AppConstants from '../../../../../core/AppConstants';
import { useNavigation } from '@react-navigation/native';
import { trackEventV2 as trackEvent } from '../../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const EthSignFriction = () => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const sheetRef = useRef<SheetBottomRef>(null);
  const [understandCheckbox, setUnderstandCheckbox] = useState(false);
  const [firstFrictionPassed, setFirstFrictionPassed] = useState(false);
  const [approveText, setApproveText] = useState<string>('');
  const navigation = useNavigation();

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

  const setText = (text: string) => {
    setApproveText(text);
  };

  const isApproveTextMatched = (text: string) =>
    tlc(text) === tlc(strings('app_settings.toggleEthSignModalFormValidation'));

  const toggleUnderstandCheckbox = () => {
    setUnderstandCheckbox(!understandCheckbox);
  };

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
    if (!firstFrictionPassed && understandCheckbox) {
      setFirstFrictionPassed(true);
    } else if (firstFrictionPassed && isApproveTextMatched(approveText)) {
      const { PreferencesController } = Engine.context;
      PreferencesController.setDisabledRpcMethodPreference('eth_sign', true);
      trackEvent(MetaMetricsEvents.SETTINGS_ADVANCED_ETH_SIGN_ENABLED, {});
      sheetRef.current?.hide();
    }
  };

  const isReadyToEnable = useMemo(
    () =>
      (understandCheckbox && !firstFrictionPassed) ||
      (firstFrictionPassed && isApproveTextMatched(approveText)),
    [understandCheckbox, firstFrictionPassed, approveText],
  );

  return (
    <SheetBottom ref={sheetRef}>
      <View style={styles.frictionContainer}>
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
          <View style={styles.areYouSure}>
            <Text style={[styles.textConfirmField, styles.bold]}>
              {strings('app_settings.toggleEthSignModalFormLabel')}
            </Text>
            <TextField
              contextMenuHidden
              autoCompleteType={'off'}
              autoCorrect={false}
              isError={approveText.length > 0 && !isReadyToEnable}
              returnKeyType={'done'}
              onEndEditing={(e) => {
                setText(e.nativeEvent.text);
              }}
              autoCapitalize="none"
              onFocus={() => setApproveText('')}
              keyboardAppearance={themeAppearance}
              {...generateTestId(Platform, ETH_SIGN_FRICTION_TEXTFIELD_TEST_ID)}
            />
            {approveText.length > 0 && !isReadyToEnable && (
              <Text style={[styles.red, styles.textConfirmWarningText]}>
                {strings('app_settings.toggleEthSignModalFormError')}
              </Text>
            )}
          </View>
        )}
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            label={strings('navigation.cancel')}
            onPress={onCancelPress}
            style={styles.buttonStart}
            accessibilityRole={'button'}
          />

          <Button
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            isDanger={firstFrictionPassed}
            label={strings(
              firstFrictionPassed
                ? 'app_settings.toggleEthSignEnableButton'
                : 'app_settings.toggleEthSignContinueButton',
            )}
            onPress={onPrimaryPress}
            isDisabled={!isReadyToEnable}
            style={styles.buttonEnd}
            accessibilityRole={'button'}
          />
        </View>
      </View>
    </SheetBottom>
  );
};

export default EthSignFriction;
