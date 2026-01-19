// Third party dependencies
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import Row from '../../components/Row';
import ScreenLayout from '../../components/ScreenLayout';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import TextField from '../../../../../../component-library/components/Form/TextField';
import Label from '../../../../../../component-library/components/Form/Label';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../../component-library/components/Buttons/Button';
import HeaderCenter from '../../../../../../component-library/components-temp/HeaderCenter';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { regex } from '../../../../../../util/regex';

// Internal dependencies
import styles from './Settings.styles';

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
  const navigation = useNavigation();
  const {
    key,
    label: initialLabel,
    active,
    onSubmit,
  } = useParams<ActivationKeyFormParams>();
  const [activationKey, setActivationKey] = useState(key ?? '');
  const [label, setLabel] = useState(initialLabel ?? '');
  const style = styles();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const title = key
    ? strings('app_settings.fiat_on_ramp.edit_activation_key')
    : strings('app_settings.fiat_on_ramp.add_activation_key');

  const handleSubmit = useCallback(() => {
    if (!regex.activationKey.test(activationKey)) {
      return;
    }
    onSubmit(activationKey, label, active);
    navigation.goBack();
  }, [activationKey, navigation, onSubmit, active, label]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <>
      <HeaderCenter
        title={title}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScreenLayout>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <Text variant={TextVariant.BodyLGMedium}>{title}</Text>

          <Row>
            <Label>{strings('app_settings.fiat_on_ramp.label')}</Label>
            <TextField
              autoCapitalize={'none'}
              onChangeText={setLabel}
              placeholder={strings('app_settings.fiat_on_ramp.add_label')}
              numberOfLines={1}
              value={label}
              returnKeyType={'done'}
              onSubmitEditing={handleSubmit}
              autoFocus
            />
          </Row>
          <Row>
            <Label>{strings('app_settings.fiat_on_ramp.key')}</Label>
            <TextField
              autoCapitalize={'none'}
              autoCorrect={false}
              onChangeText={setActivationKey}
              placeholder={strings(
                'app_settings.fiat_on_ramp.paste_or_type_activation_key',
              )}
              spellCheck={false}
              numberOfLines={1}
              value={activationKey}
              returnKeyType={'done'}
              onSubmitEditing={handleSubmit}
              isReadonly={Boolean(key)}
              autoFocus
            />
          </Row>

          <Row style={style.buttons}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              style={style.button}
              onPress={handleCancel}
              label={strings('app_settings.fiat_on_ramp.cancel')}
            />
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              style={style.button}
              onPress={handleSubmit}
              label={
                key
                  ? strings('app_settings.fiat_on_ramp.update')
                  : strings('app_settings.fiat_on_ramp.add')
              }
              isDisabled={!regex.activationKey.test(activationKey)}
            />
          </Row>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    </>
  );
}

export default ActivationKeyForm;
