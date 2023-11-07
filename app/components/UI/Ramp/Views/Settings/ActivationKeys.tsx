import React, { useCallback } from 'react';
import { ActivityIndicator, Switch, TouchableOpacity } from 'react-native';

import BaseListItem from '../../../../Base/ListItem';
import Text from '../../../../Base/Text';
import StyledButton from '../../../StyledButton';

import Row from '../../components/Row';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { strings } from '../../../../../../locales/i18n';
import { useAppTheme } from '../../../../../util/theme';
import { colors as importedColors } from '../../../../../styles/common';
import useActivationKeys from '../../hooks/useActivationKeys';

import { useFiatOnRampSDK } from '../../sdk';
import { useNavigation } from '@react-navigation/native';
import { createAddActivationKeyNavDetails } from './AddActivationKey';

import styles from './Settings.styles';

// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

function ActivationKeys() {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { isInternalBuild } = useFiatOnRampSDK();
  const style = styles(colors);

  const {
    isLoadingKeys,
    activationKeys,
    updateActivationKey,
    addActivationKey,
    removeActivationKey,
  } = useActivationKeys({
    internal: isInternalBuild,
  });

  const handleAddNewKey = useCallback(
    (key) => addActivationKey(key),
    [addActivationKey],
  );

  const handleAddNewKeyPress = useCallback(() => {
    navigation.navigate(
      ...createAddActivationKeyNavDetails({
        onSubmit: handleAddNewKey,
      }),
    );
  }, [navigation, handleAddNewKey]);

  return (
    <>
      <Text reset>
        <Text style={style.title}>
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
        <StyledButton
          type="normal"
          disabled={isLoadingKeys}
          onPress={handleAddNewKeyPress}
        >
          {strings('app_settings.fiat_on_ramp.add_activation_key')}
        </StyledButton>
      </Row>
    </>
  );
}

export default ActivationKeys;
