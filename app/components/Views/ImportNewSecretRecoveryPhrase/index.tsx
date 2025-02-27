import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  TouchableOpacity,
  TextInput,
  Text,
  View,
  ActivityIndicator,
  DimensionValue,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StyledButton from '../../UI/StyledButton';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import Icon from 'react-native-vector-icons/Feather';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { useAppTheme } from '../../../util/theme';
import { createStyles } from './styles';
import { ImportAccountFromPrivateKeyIDs } from '../../../../e2e/selectors/ImportAccount/ImportAccountFromPrivateKey.selectors';
import { importNewSecretRecoveryPhrase } from '../../../actions/multiSrp';

/**
 * View that's displayed when the user is trying to import a new secret recovery phrase
 */
const ImportNewSecretRecoveryPhrase = () => {
  const [secretRecoveryPhrase, setSecretRecoveryPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputWidth, setInputWidth] = useState<DimensionValue | undefined>(
    Device.isAndroid() ? '99%' : undefined,
  );
  const navigation = useNavigation();
  const mounted = useRef<boolean>(false);
  const { colors, themeAppearance } = useAppTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    mounted.current = true;
    // Workaround https://github.com/facebook/react-native/issues/9958
    if (inputWidth) {
      setTimeout(() => {
        mounted.current && setInputWidth('100%');
      }, 100);

      return () => {
        mounted.current = false;
      };
    }
    // eslint-disable-next-line
  }, []);

  const learnMore = () =>
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/managing-my-wallet/accounts-and-addresses/what-are-imported-accounts-/',
        title: strings('drawer.metamask_support'),
      },
    });

  const dismiss = () => {
    navigation.goBack();
  };

  const onSubmit = async () => {
    if (secretRecoveryPhrase === '') {
      Alert.alert(
        strings('import_new_secret_recovery_phrase.error_title'),
        strings('import_new_secret_recovery_phrase.error_empty_message'),
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await importNewSecretRecoveryPhrase(secretRecoveryPhrase);
      navigation.navigate('ImportPrivateKeyView', {
        screen: 'ImportPrivateKeySuccess',
      });
      setLoading(false);
      setSecretRecoveryPhrase('');
    } catch (e) {
      Alert.alert(
        strings('import_new_secret_recovery_phrase.error_title'),
        strings('import_new_secret_recovery_phrase.error_message'),
      );
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainWrapper}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.wrapper}
        style={styles.topOverlay}
        resetScrollToCoords={{ x: 0, y: 0 }}
      >
        <View
          style={styles.content}
          testID={ImportAccountFromPrivateKeyIDs.CONTAINER}
        >
          <TouchableOpacity onPress={dismiss} style={styles.navbarRightButton}>
            <MaterialIcon
              name="close"
              size={15}
              style={styles.closeIcon}
              testID={ImportAccountFromPrivateKeyIDs.CLOSE_BUTTON}
            />
          </TouchableOpacity>
          <View style={styles.top}>
            <Icon name="download" style={styles.icon} />
            <Text style={styles.title}>
              {strings('import_new_secret_recovery_phrase.title')}
            </Text>
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                {strings('import_new_secret_recovery_phrase.description')}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label} onPress={learnMore}>
                {strings('import_new_secret_recovery_phrase.learn_more_here')}
              </Text>
            </View>
          </View>
          <View style={styles.bottom}>
            <View style={styles.subtitleText}>
              <Text style={styles.subtitleText}>
                {strings('import_new_secret_recovery_phrase.subtitle')}
              </Text>
            </View>
            <TextInput
              value={secretRecoveryPhrase}
              numberOfLines={3}
              multiline
              style={[styles.input, inputWidth ? { width: inputWidth } : {}]}
              onChangeText={setSecretRecoveryPhrase}
              testID={ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX}
              blurOnSubmit
              onSubmitEditing={() => onSubmit()}
              returnKeyType={'next'}
              placeholderTextColor={colors.text.muted}
              autoCapitalize={'none'}
              keyboardAppearance={themeAppearance}
            />
          </View>
        </View>
        <View style={styles.buttonWrapper}>
          <StyledButton
            containerStyle={styles.button}
            type={'confirm'}
            onPress={() => onSubmit()}
            testID={ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary.inverse} />
            ) : (
              strings('import_new_secret_recovery_phrase.cta_text')
            )}
          </StyledButton>
        </View>
      </KeyboardAwareScrollView>
      <ScreenshotDeterrent enabled isSRP={false} />
    </View>
  );
};

export default ImportNewSecretRecoveryPhrase;
