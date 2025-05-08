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
import { importAccountFromPrivateKey } from '../../../util/address';
import { useAppTheme } from '../../../util/theme';
import { createStyles } from './styles';
import { ImportAccountFromPrivateKeyIDs } from '../../../../e2e/selectors/ImportAccount/ImportAccountFromPrivateKey.selectors';
import { QRTabSwitcherScreens } from '../QRTabSwitcher';
import Routes from '../../../constants/navigation/Routes';

/**
 * View that's displayed the first time a user receives funds
 */
const ImportPrivateKey = () => {
  const [privateKey, setPrivateKey] = useState('');
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

  const goNext = async (scannedPrivateKey?: string) => {
    const privateKeyToProcess = scannedPrivateKey || privateKey;
    if (privateKeyToProcess === '') {
      Alert.alert(
        strings('import_private_key.error_title'),
        strings('import_private_key.error_empty_message'),
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    // Import private key
    try {
      await importAccountFromPrivateKey(privateKeyToProcess);
      navigation.navigate('ImportPrivateKeyView', {
        screen: 'ImportPrivateKeySuccess',
      });
      setLoading(false);
      setPrivateKey('');
    } catch (e) {
      Alert.alert(
        strings('import_private_key.error_title'),
        strings('import_private_key.error_message'),
      );
      setLoading(false);
    }
  };

  const onScanSuccess = (data: { private_key: string; seed: string }) => {
    if (data.private_key) {
      setPrivateKey(data.private_key);
      goNext(data.private_key);
    } else if (data.seed) {
      Alert.alert(
        strings('wallet.error'),
        strings('wallet.logout_to_import_seed'),
      );
    } else {
      Alert.alert(
        strings('import_private_key.error_title'),
        strings('import_private_key.error_message'),
      );
    }
  };

  const scanPkey = () => {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Scanner,
      disableTabber: true,
      onScanSuccess,
    });
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
              {strings('import_private_key.title')}
            </Text>
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                {strings('import_private_key.description_one')}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label} onPress={learnMore}>
                {strings('import_private_key.learn_more_here')}
              </Text>
            </View>
          </View>
          <View style={styles.bottom}>
            <View style={styles.subtitleText}>
              <Text style={styles.subtitleText}>
                {strings('import_private_key.subtitle')}
              </Text>
            </View>
            <TextInput
              value={privateKey}
              numberOfLines={3}
              multiline
              style={[styles.input, inputWidth ? { width: inputWidth } : {}]}
              onChangeText={setPrivateKey}
              testID={ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX}
              blurOnSubmit
              onSubmitEditing={() => goNext()}
              returnKeyType={'next'}
              placeholder={strings('import_private_key.example')}
              placeholderTextColor={colors.text.muted}
              autoCapitalize={'none'}
              keyboardAppearance={themeAppearance}
            />
            <View style={styles.scanPkeyRow}>
              <TouchableOpacity onPress={scanPkey}>
                <Text style={styles.scanPkeyText}>
                  {strings('import_private_key.or_scan_a_qr_code')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <View style={styles.buttonWrapper}>
          <StyledButton
            containerStyle={styles.button}
            type={'confirm'}
            onPress={() => goNext()}
            testID={ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary.inverse} />
            ) : (
              strings('import_private_key.cta_text')
            )}
          </StyledButton>
        </View>
      </KeyboardAwareScrollView>
      <ScreenshotDeterrent enabled isSRP={false} />
    </View>
  );
};

export default ImportPrivateKey;
