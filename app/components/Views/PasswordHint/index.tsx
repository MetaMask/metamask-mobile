import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
// import { mockTheme } from '../../../util/theme';

const PasswordHint = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      padding: 16,
      flexDirection: 'column',
      rowGap: 16,
    },
    textContainer: {
      flexDirection: 'column',
      rowGap: 32,
    },
    buttonContainer: {
      marginTop: 'auto',
      marginBottom: 16,
    },
  });

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('password_hint.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  const handleSave = () => {
    // eslint-disable-next-line no-console
    console.log('save');
  };

  return (
    <View style={styles.root}>
      <Text variant={TextVariant.DisplayMD} color={TextColor.Default}>
        {strings('password_hint.title')}
      </Text>

      <View style={styles.textContainer}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('password_hint.description')}
        </Text>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('password_hint.description2')}
        </Text>
      </View>

      <TextField
        placeholder={strings('password_hint.placeholder')}
        size={TextFieldSize.Lg}
      />

      <Button
        label={strings('password_hint.button')}
        variant={ButtonVariants.Primary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        onPress={handleSave}
        style={styles.buttonContainer}
      />
    </View>
  );
};

export default PasswordHint;
