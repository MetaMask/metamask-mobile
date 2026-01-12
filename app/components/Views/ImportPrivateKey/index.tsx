import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  Alert,
  TextInput,
  View,
  DimensionValue,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { useAppTheme } from '../../../util/theme';
import { createStyles } from './styles';
import { ImportAccountFromPrivateKeyIDs } from '../../../../e2e/selectors/ImportAccount/ImportAccountFromPrivateKey.selectors';
import { QRTabSwitcherScreens } from '../QRTabSwitcher';
import Routes from '../../../constants/navigation/Routes';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';
import { Authentication } from '../../../core';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { selectSeedlessOnboardingAuthConnection } from '../../../selectors/seedlessOnboardingController';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';

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
  const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
    onFirstLoad: false,
    onTransactionComplete: false,
  });
  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);

  const isSRP =
    authConnection !== AuthConnection.Apple &&
    authConnection !== AuthConnection.Google;

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
        url: isSRP
          ? 'https://support.metamask.io/start/use-an-existing-wallet/#importing-using-a-private-key'
          : 'https://support.metamask.io/start/use-an-existing-wallet/#import-an-existing-wallet',
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
      const isImported =
        await Authentication.importAccountFromPrivateKey(privateKeyToProcess);
      // no need to handle error here, password outdated state will trigger modal that force user to log out
      if (isImported) {
        navigation.navigate('ImportPrivateKeyView', {
          screen: 'ImportPrivateKeySuccess',
        });
        setPrivateKey('');
        fetchAccountsWithActivity();
      }
    } catch (e) {
      Alert.alert(
        strings('import_private_key.error_title'),
        strings('import_private_key.error_message'),
      );
    } finally {
      setLoading(false);
    }
  };

  const onScanSuccess = async (data: { private_key: string; seed: string }) => {
    if (data.private_key) {
      setPrivateKey(data.private_key);
      await goNext(data.private_key);
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
    <SafeAreaView style={styles.mainWrapper}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.wrapper}
        style={styles.topOverlay}
        resetScrollToCoords={{ x: 0, y: 0 }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={100}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.content}
          testID={ImportAccountFromPrivateKeyIDs.CONTAINER}
        >
          <HeaderCenter
            onBack={dismiss}
            backButtonProps={{
              testID: ImportAccountFromPrivateKeyIDs.CLOSE_BUTTON,
            }}
          />
          <View style={styles.top}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {strings('import_private_key.title')}
              </Text>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {isSRP
                  ? strings('import_private_key.description_srp')
                  : strings('import_private_key.description_one')}
              </Text>
              {isSRP ? (
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  onPress={learnMore}
                >
                  {strings('import_private_key.learn_more_srp')}{' '}
                  <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
                    {strings('import_private_key.here')}
                  </Text>
                </Text>
              ) : (
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                  onPress={learnMore}
                >
                  <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
                    {strings('import_private_key.learn_more')}{' '}
                  </Text>
                  {strings('import_private_key.learn_more_here')}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.bottom}>
            <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
              {strings('import_private_key.subtitle')}
            </Text>
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
              <Button
                onPress={scanPkey}
                label={strings('import_private_key.or_scan_a_qr_code')}
                variant={ButtonVariants.Link}
                size={ButtonSize.Lg}
              />
            </View>
          </View>
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            onPress={() => goNext()}
            label={strings('import_private_key.cta_text')}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            loading={loading}
            testID={ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON}
          />
        </View>
      </KeyboardAwareScrollView>
      <ScreenshotDeterrent enabled isSRP={false} />
    </SafeAreaView>
  );
};

export default ImportPrivateKey;
