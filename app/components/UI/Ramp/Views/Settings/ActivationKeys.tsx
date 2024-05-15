// Third party dependencies
import React, { useCallback } from 'react';
import { ActivityIndicator, Switch, TouchableOpacity } from 'react-native';

import { useNavigation } from '@react-navigation/native';
// External dependencies
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
import { createActivationKeyFormNavDetails } from './ActivationKeyForm';

import ListItem from '../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';

function ActivationKeys() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const { isInternalBuild } = useRampSDK();

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
    (key: string, label: string, _active: boolean) =>
      addActivationKey(key, label),
    [addActivationKey],
  );

  const handleUpdateKey = useCallback(
    (key: string, label: string, active: boolean) =>
      updateActivationKey(key, label, active),
    [updateActivationKey],
  );

  const handleAddNewKeyPress = useCallback(() => {
    navigation.navigate(
      ...createActivationKeyFormNavDetails({
        onSubmit: handleAddNewKey,
        key: '',
        label: '',
        active: true,
      }),
    );
  }, [navigation, handleAddNewKey]);

  const handleEditPress = useCallback(
    (key: string, label: string, active: boolean) => {
      navigation.navigate(
        ...createActivationKeyFormNavDetails({
          onSubmit: handleUpdateKey,
          key,
          label,
          active,
        }),
      );
    },
    [navigation, handleUpdateKey],
  );

  return (
    <>
      <Text>
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
          <ListItemColumn>
            <Switch
              onValueChange={() =>
                updateActivationKey(
                  activationKey.key,
                  activationKey.label ?? '',
                  !activationKey.active,
                )
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
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Fill}>
            {activationKey.label ? (
              <Text
                color={
                  activationKey.active ? TextColor.Default : TextColor.Muted
                }
                selectable
              >
                {activationKey.label}
              </Text>
            ) : null}
            <Text
              color={activationKey.active ? TextColor.Default : TextColor.Muted}
              selectable
            >
              {activationKey.key}
            </Text>
          </ListItemColumn>
          <ListItemColumn>
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              accessibilityLabel="Edit Activation Key"
              disabled={isLoadingKeys}
              onPress={() =>
                handleEditPress(
                  activationKey.key,
                  activationKey.label || '',
                  activationKey.active,
                )
              }
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Icon
                name={IconName.Edit}
                size={IconSize.Lg}
                color={
                  isLoadingKeys
                    ? colors.primary.disabled
                    : colors.primary.default
                }
              />
            </TouchableOpacity>
          </ListItemColumn>
          <ListItemColumn>
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
          </ListItemColumn>
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
