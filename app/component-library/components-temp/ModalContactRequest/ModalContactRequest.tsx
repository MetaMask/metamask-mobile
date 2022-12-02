/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../util/theme';
import { AvatarAccountType } from '../../components/Avatars/Avatar/variants/AvatarAccount';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../components/Buttons/Button';
import { ButtonPrimaryVariants } from '../../components/Buttons/Button/variants/ButtonPrimary';
import PickerAccount from '../../components/Pickers/PickerAccount';
import Text, { TextVariants } from '../../components/Texts/Text';
import { createStyles } from './styles';

const ModalContactRequest = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View styles={styles.screen}>
      <View styles={styles.content}>
        <Text style={styles.title} variant={TextVariants.sHeadingMD}>
          You received a contact request from travisrice.eth
        </Text>
        <PickerAccount
          accountAddress="jashdkjhaskdh"
          accountName="travisrice.eth"
          accountAvatarType={AvatarAccountType.JazzIcon}
          onPress={() => {}}
        />
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            onPress={() => {}}
            label="Save"
            size={ButtonSize.Lg}
          />
          <View style={styles.buttonDivider} />
          <Button
            variant={ButtonVariants.Primary}
            onPress={() => {}}
            label="Cancel"
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    </View>
  );
};

export default ModalContactRequest;
