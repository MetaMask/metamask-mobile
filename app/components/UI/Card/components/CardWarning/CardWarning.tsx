/* eslint-disable no-console */
import React from 'react';
import createStyles from './CardWarning.styles';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  FontWeight,
  TextColor,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';

export interface CardWarningProps {
  type: 'provisioning' | 'close_spending_limit';
  onPressProvision?: () => void;
  onPressSetNewLimit?: () => void;
  onPressDismiss?: () => void;
}

const CardWarning = ({
  type,
  onPressProvision = () => {
    console.log('onPressProvision');
  },
  onPressSetNewLimit = () => {
    console.log('onPressSetNewLimit');
  },
  onPressDismiss = () => {
    console.log('onPressDismiss');
  },
}: CardWarningProps) => {
  const theme = useTheme();
  const styles = createStyles(theme);

  const warningMapping = {
    provisioning: {
      title: 'Card not provisioned',
      description: 'Provision your card to continue',
      action: 'Provision',
    },
    close_spending_limit: {
      title: 'You’re close to your spending limit',
      description: 'Update to avoid declines',
      action: 'Set new limit',
    },
  };

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.WarningDefault}
        />
        <View>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {warningMapping[type].title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Regular}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {warningMapping[type].description}
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              variant={ButtonVariants.Secondary}
              label="Dismiss"
              onPress={onPressDismiss}
            />
            <Button
              variant={ButtonVariants.Primary}
              label={warningMapping[type].action}
              onPress={
                type === 'provisioning' ? onPressProvision : onPressSetNewLimit
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default CardWarning;
