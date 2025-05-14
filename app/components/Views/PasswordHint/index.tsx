import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
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
import { SEED_PHRASE_HINTS } from '../../../constants/storage';
import StorageWrapper from '../../../store/storage-wrapper';
import { ToastVariants } from '../../../component-library/components/Toast/Toast.types';
import { ToastContext } from '../../../component-library/components/Toast/Toast.context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';
import Engine from '../../../core/Engine';

const PasswordHint = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [savedHint, setSavedHint] = useState('');
  const [hintError, setHintError] = useState<string | null>(null);
  const { toastRef } = useContext(ToastContext);

  const styles = StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    contentContainer: {
      flex: 1,
      padding: 16,
      flexDirection: 'column',
      rowGap: 16,
    },
    root: {
      flex: 1,
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

  const fetchHintFromStorage = async () => {
    const hints = await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    if (hints) {
      const parsedHints = JSON.parse(hints);
      setSavedHint(parsedHints?.manualBackup);
    } else {
      setSavedHint('');
    }
  };

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('password_hint.title'),
        navigation,
        false,
        colors,
      ),
    );
    fetchHintFromStorage();
  }, [navigation, colors]);

  const checkHintMatchesPassword = async (hint: string): Promise<boolean> => {
    const { KeyringController } = Engine.context;
    try {
      await KeyringController.verifyPassword(hint);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setHintError(null);

    const hintMatches = await checkHintMatchesPassword(savedHint);
    if (hintMatches) {
      setHintError(strings('password_hint.error_matches_password'));
      return;
    }

    const currentSeedphraseHints = await StorageWrapper.getItem(
      SEED_PHRASE_HINTS,
    );
    if (currentSeedphraseHints) {
      const parsedHints = JSON.parse(currentSeedphraseHints);
      await StorageWrapper.setItem(
        SEED_PHRASE_HINTS,
        JSON.stringify({ ...parsedHints, manualBackup: savedHint }),
      );
    } else {
      await StorageWrapper.setItem(
        SEED_PHRASE_HINTS,
        JSON.stringify({ manualBackup: savedHint }),
      );
    }

    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings('password_hint.saved_toast'),
          isBold: true,
        },
      ],
      hasNoTimeout: false,
    });

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.contentContainer}
        resetScrollToCoords={{ x: 0, y: 0 }}
        keyboardShouldPersistTaps="handled"
      >
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
            value={savedHint}
            onChangeText={(text) => {
              setSavedHint(text);
              setHintError(null);
            }}
          />
          {hintError && (
            <HelpText severity={HelpTextSeverity.Error}>
              {hintError}
            </HelpText>
          )}

          <Button
            label={strings('password_hint.saved')}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleSave}
            style={styles.buttonContainer}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default PasswordHint;
