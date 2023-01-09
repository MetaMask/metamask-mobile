import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import Text from '../../../../Base/Text';
import StyledButton from '../../../StyledButton';
import Row from '../../components/Row';
import ScreenLayout from '../../components/ScreenLayout';

import { getNavigationOptionsTitle } from '../../../Navbar';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { useTheme } from '../../../../../util/theme';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

import styles from './Settings.styles';

const activationKeyRegex = /^[a-zA-Z0-9\\-]{1,32}$/;

interface AddActivationKeyParams {
  onSubmit: (key: string) => void;
}

export const createAddActivationKeyNavDetails =
  createNavigationDetails<AddActivationKeyParams>(
    Routes.FIAT_ON_RAMP_AGGREGATOR.ADD_ACTIVATION_KEY,
  );

function AddActivationKey() {
  const navigation = useNavigation();
  const [newKey, setNewKey] = useState('');
  const { colors, themeAppearance } = useTheme();
  const style = styles(colors);
  const { onSubmit } = useParams<AddActivationKeyParams>();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.fiat_on_ramp.add_activation_key'),
        navigation,
        false,
        colors,
        false,
      ),
    );
  }, [colors, navigation]);

  const handleSubmit = useCallback(() => {
    if (!activationKeyRegex.test(newKey)) {
      return;
    }
    onSubmit(newKey);
    navigation.goBack();
  }, [navigation, newKey, onSubmit]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => inputRef.current?.focus(), []);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          <Text style={style.title}>
            {strings('app_settings.fiat_on_ramp.add_activation_key')}
          </Text>
          <Row>
            <TextInput
              ref={inputRef}
              key="text-input"
              autoCapitalize={'none'}
              autoCorrect={false}
              onChangeText={setNewKey}
              placeholder={strings(
                'app_settings.fiat_on_ramp.paste_or_type_activation_key',
              )}
              placeholderTextColor={colors.text.muted}
              spellCheck={false}
              numberOfLines={1}
              style={style.input}
              value={newKey}
              keyboardAppearance={themeAppearance}
              returnKeyType={'done'}
              onSubmitEditing={handleSubmit}
            />
          </Row>

          <Row style={style.buttons}>
            <StyledButton
              key="confirm-button"
              type="confirm"
              disabled={!activationKeyRegex.test(newKey)}
              containerStyle={style.button}
              onPress={handleSubmit}
            >
              {strings('app_settings.fiat_on_ramp.add')}
            </StyledButton>
            <StyledButton
              key="cancel-button"
              type="cancel"
              containerStyle={style.button}
              onPress={handleCancel}
            >
              {strings('app_settings.fiat_on_ramp.cancel')}
            </StyledButton>
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default AddActivationKey;
