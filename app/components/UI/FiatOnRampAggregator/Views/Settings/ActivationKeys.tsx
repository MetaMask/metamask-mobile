import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Switch,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import BaseListItem from '../../../../Base/ListItem';
import Text from '../../../../Base/Text';
import StyledButton from '../../../StyledButton';

import Row from '../../components/Row';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../../../locales/i18n';
import { useAppTheme } from '../../../../../util/theme';
import { colors as importedColors } from '../../../../../styles/common';
import useActivationKeys from '../../hooks/useActivationKeys';
import styles from './Settings.styles';
import { useFiatOnRampSDK } from '../../sdk';

const activationKeyRegex = /^[a-zA-Z0-9\\-]{1,32}$/;

// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

function ActivationKeys() {
  const [newKey, setNewKey] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { colors, themeAppearance } = useAppTheme();
  const style = styles(colors);
  const { isInternalBuild } = useFiatOnRampSDK();

  const {
    isLoadingKeys,
    activationKeys,
    updateActivationKey,
    addActivationKey,
    removeActivationKey,
  } = useActivationKeys({
    internal: isInternalBuild,
  });

  const handleAddNewKey = useCallback(() => {
    if (activationKeyRegex.test(newKey)) {
      addActivationKey(newKey);
      setNewKey('');
      setIsEditing(false);
    }
  }, [addActivationKey, newKey]);

  return (
    <>
      <Text reset>
        <Text biggest>
          {strings('app_settings.fiat_on_ramp.sdk_activation_keys')}
        </Text>
        <Text>
          {'  '}
          {isLoadingKeys ? <ActivityIndicator size="small" /> : null}
        </Text>
      </Text>
      <Row>
        <Text grey>
          {strings('app_settings.fiat_on_ramp.activation_keys_description')}
        </Text>
      </Row>
      {activationKeys.map((activationKey) => (
        <ListItem key={activationKey.key}>
          <ListItem.Content>
            <ListItem.Icon>
              <Switch
                onValueChange={() =>
                  updateActivationKey(activationKey.key, !activationKey.active)
                }
                value={activationKey.active}
                trackColor={{
                  true: colors.primary.default,
                  false: colors.border.muted,
                }}
                thumbColor={importedColors.white}
                ios_backgroundColor={colors.border.muted}
                disabled={isLoadingKeys}
              />
            </ListItem.Icon>
            <ListItem.Body>
              <Text muted={isLoadingKeys} selectable>
                {activationKey.key}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              <TouchableOpacity
                disabled={isLoadingKeys}
                onPress={() => removeActivationKey(activationKey.key)}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={20}
                  color={
                    isLoadingKeys ? colors.error.disabled : colors.error.default
                  }
                />
              </TouchableOpacity>
            </ListItem.Amounts>
          </ListItem.Content>
        </ListItem>
      ))}
      <Row>
        {!isEditing ? (
          <Row>
            <StyledButton
              type="normal"
              disabled={isLoadingKeys}
              onPress={() => setIsEditing(true)}
            >
              {strings('app_settings.fiat_on_ramp.add_activation_key')}
            </StyledButton>
          </Row>
        ) : (
          <>
            <Row>
              <TextInput
                autoCapitalize={'none'}
                autoCorrect={false}
                onChangeText={setNewKey}
                placeholder={'Paste or type Activation Key'}
                placeholderTextColor={colors.text.muted}
                spellCheck={false}
                numberOfLines={1}
                style={style.input}
                value={newKey}
                keyboardAppearance={themeAppearance}
                returnKeyType={'done'}
                onSubmitEditing={handleAddNewKey}
              />
            </Row>

            <Row style={style.buttons}>
              <StyledButton
                type="confirm"
                disabled={isLoadingKeys || !activationKeyRegex.test(newKey)}
                containerStyle={style.button}
                onPress={handleAddNewKey}
              >
                {strings('app_settings.fiat_on_ramp.add')}
              </StyledButton>
              <StyledButton
                type="cancel"
                disabled={isLoadingKeys}
                containerStyle={style.button}
                onPress={() => {
                  setNewKey('');
                  setIsEditing(false);
                }}
              >
                {strings('app_settings.fiat_on_ramp.cancel')}
              </StyledButton>
            </Row>
          </>
        )}
      </Row>
    </>
  );
}

export default ActivationKeys;
