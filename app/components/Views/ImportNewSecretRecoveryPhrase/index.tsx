import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useContext,
  useRef,
} from 'react';
import { Alert, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import StyledButton from '../../UI/StyledButton';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { strings } from '../../../../locales/i18n';
import { useAppTheme } from '../../../util/theme';
import { createStyles } from './styles';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import { importNewSecretRecoveryPhrase } from '../../../actions/multiSrp';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { useSelector } from 'react-redux';
import { selectHDKeyrings } from '../../../selectors/keyringController';
import useMetrics from '../../hooks/useMetrics/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useAccountsWithNetworkActivitySync } from '../../hooks/useAccountsWithNetworkActivitySync';
import { Authentication } from '../../../core';
import { isMultichainAccountsState2Enabled } from '../../../multichain-accounts/remote-feature-flag';
import Routes from '../../../constants/navigation/Routes';
import { QRTabSwitcherScreens } from '../QRTabSwitcher';
import Logger from '../../../util/Logger';
import { v4 as uuidv4 } from 'uuid';
import SrpInput from '../SrpInput';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import { getTrimmedSeedPhraseLength, isFirstInput as SRPUtils_isFirstInput, isSRPLengthValid, checkForWordErrors, handleSeedPhraseChangeAtIndex as SRPUtils_handleSeedPhraseChangeAtIndex, handleSeedPhraseChange as SRPUtils_handleSeedPhraseChange, handleClearSeedPhrase, handleOnFocus as SRPUtils_handleOnFocus, handleKeyPress as SRPUtils_handleKeyPress, handleEnterKeyPress as SRPUtils_handleEnterKeyPress, getSeedPhraseInputRef, getInputValue } from '../../../util/srp/srpInputUtils';

/**
 * View that's displayed when the user is trying to import a new secret recovery phrase
 */
const ImportNewSecretRecoveryPhrase = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { toastRef } = useContext(ToastContext);

  // Refs
  const seedPhraseInputRefs = useRef<Map<
    number,
    { focus: () => void; blur: () => void }
  > | null>(null);

  // State
  const [seedPhrase, setSeedPhrase] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorWordIndexes, setErrorWordIndexes] = useState<
    Record<number, boolean>
  >({});
  const [seedPhraseInputFocusedIndex, setSeedPhraseInputFocusedIndex] =
    useState<number | null>(null);
  const [nextSeedPhraseInputFocusedIndex, setNextSeedPhraseInputFocusedIndex] =
    useState<number | null>(null);

  const hdKeyrings = useSelector(selectHDKeyrings);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
    onFirstLoad: false,
    onTransactionComplete: false,
  });

  // Helper to get word count
  const trimmedSeedPhraseLength = useMemo(
    () => getTrimmedSeedPhraseLength(seedPhrase),
    [seedPhrase],
  );

  const uniqueId = useMemo(() => uuidv4(), []);

  const isFirstInput = useMemo(
    () => SRPUtils_isFirstInput(seedPhrase),
    [seedPhrase],
  );

  // Check if continue button should be disabled
  const isSRPContinueButtonDisabled = useMemo(
    () => !isSRPLengthValid(seedPhrase),
    [seedPhrase],
  );

  // Validate and show errors
  useEffect(() => {
    const wordErrorMap = checkForWordErrors(seedPhrase);
    const hasWordErrors = Object.values(wordErrorMap).some(Boolean);
    if (hasWordErrors) {
      setError(strings('import_from_seed.spellcheck_error'));
    } else {
      setError('');
    }
    setErrorWordIndexes(wordErrorMap);
  }, [seedPhrase]);

  // Handle text change in individual input (for grid mode)
  const handleSeedPhraseChangeAtIndex = useCallback(
    (seedPhraseText: string, index: number) => {
      SRPUtils_handleSeedPhraseChangeAtIndex(
        seedPhraseText,
        index,
        seedPhrase,
        {
          setSeedPhrase,
          setSeedPhraseInputFocusedIndex,
          setNextSeedPhraseInputFocusedIndex,
        },
      );
    },
    [seedPhrase],
  );

  // Handle text change in first input (textarea mode)
  const handleSeedPhraseChange = useCallback(
    (seedPhraseText: string) => {
      SRPUtils_handleSeedPhraseChange(seedPhraseText, seedPhrase, {
        setSeedPhrase,
        setSeedPhraseInputFocusedIndex,
        setNextSeedPhraseInputFocusedIndex,
        handleSeedPhraseChangeAtIndex,
        seedPhraseInputRefs: seedPhraseInputRefs.current,
      });
    },
    [seedPhrase, handleSeedPhraseChangeAtIndex],
  );

  // Clear all
  const handleClear = useCallback(() => {
    handleClearSeedPhrase({
      setSeedPhrase,
      setErrorWordIndexes,
      setError,
      setSeedPhraseInputFocusedIndex,
      setNextSeedPhraseInputFocusedIndex,
    });
  }, []);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    const text = await Clipboard.getString();
    if (text.trim() !== '') {
      handleSeedPhraseChange(text);
    }
  }, [handleSeedPhraseChange]);

  const dismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showWhatIsSeedPhrase = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SEEDPHRASE_MODAL,
    });
  }, [navigation]);

  const onQrCodePress = useCallback(() => {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Scanner,
      disableTabber: true,
      onScanSuccess: (data: { seed?: string }, content?: string) => {
        const seed = data?.seed || content;

        if (seed) {
          handleClear();
          handleSeedPhraseChange(seed);
        } else {
          Alert.alert(
            strings('import_new_secret_recovery_phrase.invalid_qr_code_title'),
            strings(
              'import_new_secret_recovery_phrase.invalid_qr_code_message',
            ),
          );
        }
      },
      onScanError: (error: unknown) => {
        Logger.error(error as Error, 'QR scan error');
      },
    });
  }, [navigation, handleClear, handleSeedPhraseChange]);

  // Focus management
  useEffect(() => {
    if (nextSeedPhraseInputFocusedIndex === null) return;

    const refElement = seedPhraseInputRefs.current?.get(
      nextSeedPhraseInputFocusedIndex,
    );

    refElement?.focus();
  }, [nextSeedPhraseInputFocusedIndex]);

  const handleOnFocus = useCallback(
    (index: number) => {
      SRPUtils_handleOnFocus(index, seedPhraseInputFocusedIndex, seedPhrase, {
        setErrorWordIndexes,
        setSeedPhraseInputFocusedIndex,
        setNextSeedPhraseInputFocusedIndex,
      });
    },
    [seedPhrase, seedPhraseInputFocusedIndex],
  );

  const handleKeyPress = useCallback(
    (e: { nativeEvent: { key: string } }, index: number) => {
      SRPUtils_handleKeyPress(e, index, seedPhrase, {
        setSeedPhrase,
        setNextSeedPhraseInputFocusedIndex,
      });
    },
    [seedPhrase],
  );

  const handleEnterKeyPress = useCallback(
    (index: number) => {
      SRPUtils_handleEnterKeyPress(
        index,
        seedPhrase,
        handleSeedPhraseChangeAtIndex,
      );
    },
    [seedPhrase, handleSeedPhraseChangeAtIndex],
  );

  const headerLeft = useCallback(
    () => (
      <TouchableOpacity onPress={dismiss} style={styles.headerButton}>
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          testID={ImportSRPIDs.BACK}
        />
      </TouchableOpacity>
    ),
    [dismiss, styles],
  );

  const headerRight = useCallback(
    () => (
      <TouchableOpacity onPress={onQrCodePress} style={styles.headerButton}>
        <Icon name={IconName.Scan} size={IconSize.Lg} testID="qr-code-button" />
      </TouchableOpacity>
    ),
    [onQrCodePress, styles],
  );

  const updateNavBar = useCallback(() => {
    navigation.setOptions({
      headerShown: true,
      ...getOnboardingNavbarOptions(
        route,
        {
          headerLeft,
          headerRight,
        },
        colors,
        false,
      ),
    });
  }, [navigation, route, headerLeft, headerRight, colors]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const trackDiscoveryEvent = (discoveredAccountsCount: number) => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.IMPORT_SECRET_RECOVERY_PHRASE_COMPLETED,
      )
        .addProperties({
          number_of_solana_accounts_discovered: discoveredAccountsCount,
        })
        .build(),
    );
  };

  const onSubmit = async () => {
    setLoading(true);
    try {
      // check if seedless pwd is outdated skip cache before importing SRP
      const isSeedlessPwdOutdated =
        await Authentication.checkIsSeedlessPasswordOutdated(true);
      if (isSeedlessPwdOutdated) {
        // no need to handle error here, password outdated state will trigger modal that force user to log out
        return;
      }

      // Parse SRP from array to string
      const phrase = seedPhrase
        .map((item) => item.trim())
        .filter((item) => item !== '')
        .join(' ');

      // In case state 2 is enabled, discoverAccounts will be 0 because accounts are synced and then discovered
      // in a non-blocking way. So we rely on the callback to track the event when the discovery is done.
      const { discoveredAccountsCount } = await importNewSecretRecoveryPhrase(
        phrase,
        undefined,
        async ({ discoveredAccountsCount }) => {
          trackDiscoveryEvent(discoveredAccountsCount);
        },
      );
      setLoading(false);
      setSeedPhrase(['']);

      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: `${strings('import_new_secret_recovery_phrase.success_1')} ${
              hdKeyrings.length + 1
            } ${strings('import_new_secret_recovery_phrase.success_2')}`,
          },
        ],
        iconName: IconName.Check,
        hasNoTimeout: false,
      });

      fetchAccountsWithActivity();

      if (!isMultichainAccountsState2Enabled()) {
        trackDiscoveryEvent(discoveredAccountsCount);
      }

      navigation.navigate('WalletView');
    } catch (e) {
      if (
        (e as Error)?.message === 'This mnemonic has already been imported.'
      ) {
        Alert.alert(
          strings('import_new_secret_recovery_phrase.error_duplicate_srp'),
        );
      } else {
        Alert.alert(
          strings('import_new_secret_recovery_phrase.error_title'),
          strings('import_new_secret_recovery_phrase.error_message'),
        );
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.mainWrapper}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.wrapper}
        testID={ImportSRPIDs.CONTAINER}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text variant={TextVariant.DisplayMD} style={styles.title}>
          {strings('import_new_secret_recovery_phrase.import_wallet_title')}
        </Text>

        <View style={styles.contentContainer}>
          {/* Subtitle with info icon */}
          <View style={styles.subtitleContainer}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('import_new_secret_recovery_phrase.enter_srp_subtitle')}
            </Text>
            <TouchableOpacity onPress={showWhatIsSeedPhrase} testID="info-icon">
              <Icon
                name={IconName.Info}
                size={IconSize.Md}
                color={colors.icon.alternative}
              />
            </TouchableOpacity>
          </View>

          {/* Dynamic Grid: Single textarea → Numbered boxes */}
          <View style={styles.seedPhraseRoot}>
            <View style={styles.seedPhraseContainer}>
              <View style={styles.seedPhraseInnerContainer}>
                <View style={styles.seedPhraseInputContainer}>
                  {seedPhrase.map((item, index) => (
                    <SrpInput
                      key={`seed-phrase-item-${uniqueId}-${index}`}
                      ref={(ref) => {
                        const inputRefs = getSeedPhraseInputRef(
                          seedPhraseInputRefs.current,
                        );
                        if (!seedPhraseInputRefs.current) {
                          seedPhraseInputRefs.current = inputRefs;
                        }
                        if (ref) {
                          inputRefs.set(index, ref);
                        } else {
                          inputRefs.delete(index);
                        }
                      }}
                      startAccessory={
                        !isFirstInput && (
                          <Text
                            variant={TextVariant.BodyMDBold}
                            color={TextColor.Alternative}
                            style={styles.inputIndex}
                          >
                            {index + 1}.
                          </Text>
                        )
                      }
                      value={getInputValue(
                        isFirstInput,
                        index,
                        item,
                        seedPhrase,
                      )}
                      onFocus={() => {
                        handleOnFocus(index);
                      }}
                      onInputFocus={() => {
                        setNextSeedPhraseInputFocusedIndex(index);
                      }}
                      onChangeText={(text) => {
                        isFirstInput
                          ? handleSeedPhraseChange(text)
                          : handleSeedPhraseChangeAtIndex(text, index);
                      }}
                      onSubmitEditing={() => {
                        handleEnterKeyPress(index);
                      }}
                      placeholder={
                        isFirstInput
                          ? strings(
                              'import_new_secret_recovery_phrase.textarea_placeholder',
                            )
                          : ''
                      }
                      placeholderTextColor={
                        isFirstInput
                          ? colors.text.alternative
                          : colors.text.muted
                      }
                      size={TextFieldSize.Md}
                      style={
                        isFirstInput
                          ? styles.seedPhraseDefaultInput
                          : [
                              styles.input,
                              styles.seedPhraseInputItem,
                              (index + 1) % 3 === 0 &&
                                styles.seedPhraseInputItemLast,
                            ]
                      }
                      inputStyle={
                        (isFirstInput
                          ? styles.textAreaInput
                          : styles.inputItem) as never
                      }
                      submitBehavior="submit"
                      autoComplete="off"
                      textAlignVertical={isFirstInput ? 'top' : 'center'}
                      showSoftInputOnFocus
                      isError={errorWordIndexes[index]}
                      autoCapitalize="none"
                      numberOfLines={1}
                      testID={
                        isFirstInput
                          ? ImportSRPIDs.PASTE_BUTTON
                          : `${ImportSRPIDs.PASTE_BUTTON}_${index}`
                      }
                      keyboardType="default"
                      autoCorrect={false}
                      textContentType="oneTimeCode"
                      spellCheck={false}
                      autoFocus={
                        isFirstInput ||
                        index === nextSeedPhraseInputFocusedIndex
                      }
                      multiline={isFirstInput}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* Paste/Clear Button */}
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Primary}
              style={styles.pasteText}
              onPress={() => {
                if (trimmedSeedPhraseLength >= 1) {
                  handleClear();
                } else {
                  handlePaste();
                }
              }}
            >
              {trimmedSeedPhraseLength >= 1
                ? strings('import_from_seed.clear_all')
                : strings('import_from_seed.paste')}
            </Text>

            {/* Error Text */}
            {Boolean(error) && (
              <Text variant={TextVariant.BodySMMedium} color={TextColor.Error}>
                {error}
              </Text>
            )}
          </View>

          {/* Continue Button */}
          <View style={styles.buttonWrapper}>
            <StyledButton
              containerStyle={styles.button}
              type={'confirm'}
              onPress={onSubmit}
              disabled={
                isSRPContinueButtonDisabled || Boolean(error) || loading
              }
              testID={ImportSRPIDs.IMPORT_BUTTON}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primary.inverse}
                />
              ) : (
                strings('import_new_secret_recovery_phrase.cta_text')
              )}
            </StyledButton>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <ScreenshotDeterrent enabled isSRP />
    </SafeAreaView>
  );
};

export default ImportNewSecretRecoveryPhrase;
