// Third party dependencies
import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  IconName,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../../component-library/components/Buttons/ButtonIcon';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';

import Row from '../../components/Row';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import useActivationKeys from '../../hooks/useActivationKeys';

import { useRampSDK } from '../../sdk';

// Internal dependencies
import { createActivationKeyFormNavDetails } from './ActivationKeyForm';

import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  titleLoader: {
    marginLeft: 8,
  },
});

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
      <View style={styles.titleRow}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings('app_settings.fiat_on_ramp.sdk_activation_keys')}
        </Text>
        {isLoadingKeys ? (
          <View style={styles.titleLoader}>
            <ActivityIndicator size="small" />
          </View>
        ) : null}
      </View>
      <Row>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
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
              thumbColor={theme.brandColors.white}
              ios_backgroundColor={colors.border.muted}
              disabled={isLoadingKeys}
            />
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Fill}>
            {activationKey.label ? (
              <Text
                variant={TextVariant.BodyMd}
                color={
                  activationKey.active
                    ? TextColor.TextDefault
                    : TextColor.TextAlternative
                }
                selectable
              >
                {activationKey.label}
              </Text>
            ) : null}
            <Text
              variant={TextVariant.BodyMd}
              color={
                activationKey.active
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
              selectable
            >
              {activationKey.key}
            </Text>
          </ListItemColumn>
          <ListItemColumn>
            <ButtonIcon
              accessibilityLabel={strings(
                'app_settings.fiat_on_ramp.edit_activation_key',
              )}
              accessibilityRole="button"
              disabled={isLoadingKeys}
              onPress={() =>
                handleEditPress(
                  activationKey.key,
                  activationKey.label || '',
                  activationKey.active,
                )
              }
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              iconName={IconName.Edit}
              iconColor={IconColor.Primary}
              size={ButtonIconSizes.Lg}
            />
          </ListItemColumn>
          <ListItemColumn>
            <ButtonIcon
              accessibilityRole="button"
              accessibilityLabel="Delete activation key"
              disabled={isLoadingKeys}
              onPress={() => removeActivationKey(activationKey.key)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              iconName={IconName.Trash}
              iconColor={IconColor.Error}
              size={ButtonIconSizes.Lg}
            />
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
