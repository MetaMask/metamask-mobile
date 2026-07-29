// Third party dependencies
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';

// External dependencies
import Row from '../../components/Row';
import ScreenLayout from '../../components/ScreenLayout';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Label,
  TextField,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../../locales/i18n';
import { regex } from '../../../../../../util/regex';

// Internal dependencies
import styles from './Settings.styles';

export const ACTIVATION_KEY_FORM_HEADER_TEST_ID = 'activation-key-form-header';
export const ACTIVATION_KEY_FORM_BACK_BUTTON_TEST_ID =
  'activation-key-form-back-button';

interface ActivationKeyFormParams {
  onSubmit: (key: string, label: string, active: boolean) => void;
  key: string;
  active: boolean;
  label: string;
}

export const createActivationKeyFormNavDetails =
  createNavigationDetails<ActivationKeyFormParams>(
    Routes.RAMP.ACTIVATION_KEY_FORM,
  );

function ActivationKeyForm() {
  const navigation = useNavigation<AppNavigationProp>();
  const {
    key,
    label: initialLabel,
    active,
    onSubmit,
  } = useParams<ActivationKeyFormParams>();
  const [activationKey, setActivationKey] = useState(key ?? '');
  const [label, setLabel] = useState(initialLabel ?? '');
  const style = styles();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(() => {
    if (!regex.activationKey.test(activationKey)) {
      return;
    }
    onSubmit(activationKey, label, active);
    navigation.goBack();
  }, [activationKey, navigation, onSubmit, active, label]);

  const title = key
    ? strings('app_settings.fiat_on_ramp.edit_activation_key')
    : strings('app_settings.fiat_on_ramp.add_activation_key');

  return (
    <SafeAreaView edges={['top']} style={style.container}>
      <HeaderStandard
        testID={ACTIVATION_KEY_FORM_HEADER_TEST_ID}
        title={title}
        onBack={handleBack}
        backButtonProps={{ testID: ACTIVATION_KEY_FORM_BACK_BUTTON_TEST_ID }}
      />
      <ScreenLayout>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={style.activationKeyFormBody}
        >
          <ScreenLayout.Body style={style.activationKeyFormBody}>
            <ScreenLayout.Content style={style.activationKeyFormContent}>
              <View style={style.activationKeyFormFields}>
                <Row style={style.activationKeyFormField}>
                  <Label>{strings('app_settings.fiat_on_ramp.label')}</Label>
                  <TextField
                    onChangeText={setLabel}
                    placeholder={strings('app_settings.fiat_on_ramp.add_label')}
                    style={style.activationKeyTextField}
                    value={label}
                    autoFocus
                    inputProps={{
                      autoCapitalize: 'none',
                      numberOfLines: 1,
                      returnKeyType: 'next',
                    }}
                  />
                </Row>
                <Row style={style.activationKeyFormField}>
                  <Label>{strings('app_settings.fiat_on_ramp.key')}</Label>
                  <TextField
                    onChangeText={setActivationKey}
                    placeholder={strings(
                      'app_settings.fiat_on_ramp.paste_or_type_activation_key',
                    )}
                    style={style.activationKeyTextField}
                    value={activationKey}
                    isReadOnly={Boolean(key)}
                    inputProps={{
                      autoCapitalize: 'none',
                      autoCorrect: false,
                      spellCheck: false,
                      numberOfLines: 1,
                      returnKeyType: 'done',
                      onSubmitEditing: handleSubmit,
                    }}
                  />
                </Row>
              </View>
            </ScreenLayout.Content>
            <ScreenLayout.Footer style={style.activationKeyFormFooter}>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                style={style.activationKeyFormButton}
                onPress={handleSubmit}
                isDisabled={!regex.activationKey.test(activationKey)}
                isFullWidth
              >
                {key
                  ? strings('app_settings.fiat_on_ramp.update')
                  : strings('app_settings.fiat_on_ramp.add')}
              </Button>
            </ScreenLayout.Footer>
          </ScreenLayout.Body>
        </KeyboardAvoidingView>
      </ScreenLayout>
    </SafeAreaView>
  );
}

export default ActivationKeyForm;
