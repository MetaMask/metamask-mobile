// Third party dependencies
import React, { useCallback } from 'react';
import { ActivityIndicator, Switch, TouchableOpacity } from 'react-native';

import { useNavigation } from '@react-navigation/native';
// External dependencies
import BaseListItem from '../../../../Base/ListItem';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';

import Row from '../../components/Row';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import useActivationKeys from '../../hooks/useActivationKeys';

import { useRampSDK } from '../../sdk';

// Internal dependencies
import { createAddActivationKeyNavDetails } from './AddActivationKey';

import styles from './Settings.styles';

// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

function ActivationKeys() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const { isInternalBuild } = useRampSDK();
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
      <Text style={style.title}>
        <Text variant={TextVariant.BodyLGMedium}>
          {strings('app_settings.fiat_on_ramp.sdk_activation_keys')}
        </Text>
        <Text>
          {'  '}
          {isLoadingKeys ? <ActivityIndicator size="small" /> : null}
        </Text>
      </Text>
      <Row>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
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
                thumbColor={theme.brandColors.white['000']}
                ios_backgroundColor={colors.border.muted}
                disabled={isLoadingKeys}
              />
            </ListItem.Icon>
            <ListItem.Body>
              <Text color={TextColor.Muted} selectable>
                {activationKey.key}
              </Text>
            </ListItem.Body>
            <ListItem.Amounts>
              <TouchableOpacity
                accessible
                accessibilityRole="button"
                accessibilityLabel="Delete Activation Key"
                disabled={isLoadingKeys}
                onPress={() => removeActivationKey(activationKey.key)}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Icon
                  name={IconName.Trash}
                  size={IconSize.Lg}
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
        <Button
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          isDisabled={isLoadingKeys}
          onPress={handleAddNewKeyPress}
          label={strings('app_settings.fiat_on_ramp.add_activation_key')}
        />
      </Row>
    </>
  );
}

export default ActivationKeys;
