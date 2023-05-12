// Third party dependencies.
import React, { useRef, useState } from 'react';
import { Platform, View } from 'react-native';

// External dependencies.
import SheetBottom, {
  SheetBottomRef,
} from '../../../../../component-library/components/Sheet/SheetBottom';
import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../Base/Text';

// Internal dependencies
import { useTheme } from '../../../../../util/theme';
import createStyles from './EthSignFriction.styles';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import CheckBox from '@react-native-community/checkbox';
import StyledButton from '../../../../UI/StyledButton/index.ios';
import { OutlinedTextField } from 'react-native-material-textfield';
import { DELETE_WALLET_INPUT_BOX_ID } from '../../../../../constants/test-ids';
import generateTestId from '../../../../../../wdio/utils/generateTestId';
import Engine from '../../../../../core/Engine';
import { tlc } from '../../../../../util/general';

const EthSignFriction = () => {
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);
  const sheetRef = useRef<SheetBottomRef>(null);
  const checkboxRef = useRef<CheckBox>(null);
  const [understandCheckbox, setUnderstandCheckbox] = useState(false);
  const [firstFrictionPassed, setFirstFrictionPassed] = useState(false);
  const [approveText, setApproveText] = useState<string>('');

  const onLearnMorePress = () => {
    //TODO navigate to support center
    //eslint-disable-next-line no-console
    console.log('learn more pressed');
  };

  const onCancelPress = () => {
    sheetRef.current?.hide();
  };

  const onContinuePress = () => {
    if (!firstFrictionPassed && understandCheckbox) {
      setFirstFrictionPassed(true);
    } else if (firstFrictionPassed) {
      const { PreferencesController } = Engine.context;
      PreferencesController.setDisabledRpcMethodPreference('eth_sign', true);
      sheetRef.current?.hide();
    }
  };

  const isApproveTextMatched = (text: string) =>
    tlc(text) === 'i only sign what i understand';

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
          <Text>{strings('app_settings.toggleEthSignModalDescription')}</Text>
          <Text primary noMargin link onPress={onLearnMorePress}>
            {' '}
            {strings('app_settings.toggleEthSignLearnMore')}
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
          <View style={[styles.understandCheckboxView]}>
            <CheckBox
              ref={checkboxRef}
              value={understandCheckbox}
              style={styles.understandCheckbox}
              onValueChange={setUnderstandCheckbox}
              boxType={'square'}
              tintColors={{
                true: colors.primary.default,
                false: colors.border.default,
              }}
            />
            <Text
              onPress={() => setUnderstandCheckbox(!understandCheckbox)}
              style={styles.understandCheckText}
            >
              {strings('app_settings.toggleEthSignModalCheckBox')}
            </Text>
          </View>
        ) : (
          <View style={styles.areYouSure}>
            <Text style={styles.heading}>
              {strings('app_settings.toggleEthSignModalFormLabel')}
            </Text>
            <OutlinedTextField
              // TODO prevent copy paste
              style={styles.input}
              testID={DELETE_WALLET_INPUT_BOX_ID}
              {...generateTestId(Platform, DELETE_WALLET_INPUT_BOX_ID)}
              autoFocus
              returnKeyType={'done'}
              onChangeText={setApproveText}
              autoCapitalize="none"
              value={approveText}
              baseColor={colors.border.default}
              tintColor={colors.primary.default}
              placeholderTextColor={colors.text.muted}
              keyboardAppearance={themeAppearance}
            />
          </View>
        )}
        <View style={styles.buttonsContainer}>
          <StyledButton
            containerStyle={styles.cancelContainerStyle}
            type={'cancel'}
            onPress={onCancelPress}
          >
            {'Cancel'}
          </StyledButton>
          <StyledButton
            disabled={
              !(
                (understandCheckbox && !firstFrictionPassed) ||
                (firstFrictionPassed && isApproveTextMatched(approveText))
              )
            }
            containerStyle={styles.cancelContainerStyle}
            type={'confirm'}
            onPress={onContinuePress}
          >
            {'Continue'}
          </StyledButton>
        </View>
      </View>
    </SheetBottom>
  );
};

export default EthSignFriction;
