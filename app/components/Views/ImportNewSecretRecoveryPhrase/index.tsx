import React, {
  useState,
  useCallback,
  useMemo,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { Alert, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import StyledButton from '../../UI/StyledButton';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
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
import SrpInputGrid, { SrpInputGridRef } from '../../UI/SrpInputGrid';
import SrpWordSuggestions from '../../UI/SrpWordSuggestions';
import { selectImportSrpWordSuggestionEnabledFlag } from '../../../selectors/featureFlagController/importSrpWordSuggestion';
import { isSRPLengthValid, SPACE_CHAR } from '../../../util/srp/srpInputUtils';
import {
  validateSRP,
  validateCompleteness,
  validateCase,
  validateWords,
  validateMnemonic,
} from './validation';

/**
 * View that's displayed when the user is trying to import a new secret recovery phrase
 */
const ImportNewSecretRecoveryPhrase = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { toastRef } = useContext(ToastContext);
  const srpInputGridRef = useRef<SrpInputGridRef>(null);

  // State
  const [seedPhrase, setSeedPhrase] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentInputWord, setCurrentInputWord] = useState('');

  // Feature flag for SRP word suggestions
  const isSrpWordSuggestionsEnabled = useSelector(
    selectImportSrpWordSuggestionEnabledFlag,
  );

  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);

  const hdKeyrings = useSelector(selectHDKeyrings);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { fetchAccountsWithActivity } = useAccountsWithNetworkActivitySync({
    onFirstLoad: false,
    onTransactionComplete: false,
  });

  const uniqueId = useMemo(() => uuidv4(), []);

  // Check if continue button should be disabled
  const isSRPContinueButtonDisabled = useMemo(
    () => !isSRPLengthValid(seedPhrase),
    [seedPhrase],
  );

  useEffect(() => {
    if (error) {
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedPhrase]);

  const dismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showWhatIsSeedPhrase = useCallback(() => {
    navigation.navigate(Routes.SHEET.SEEDPHRASE_MODAL);
  }, [navigation]);

  const onQrCodePress = useCallback(() => {
    navigation.navigate(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Scanner,
      disableTabber: true,
      onScanSuccess: (data: { seed?: string }, content?: string) => {
        const seed = data?.seed || content;

        if (seed) {
          srpInputGridRef.current?.handleSeedPhraseChange(seed);
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
  }, [navigation]);

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
    const phrase = seedPhrase
      .map((item) => item.trim())
      .filter((item) => item !== '')
      .join(SPACE_CHAR);

    setError('');

    const invalidWords = Array(seedPhrase.length).fill(false);
    let validationResult = validateSRP(seedPhrase, invalidWords);
    validationResult = validateCompleteness(validationResult, seedPhrase);
    validationResult = validateCase(validationResult, phrase);
    validationResult = validateWords(validationResult);
    validationResult = validateMnemonic(validationResult, phrase);

    if (validationResult.error) {
      setError(validationResult.error);
      return;
    }

    setLoading(true);
    try {
      // check if seedless pwd is outdated skip cache before importing SRP
      const isSeedlessPwdOutdated =
        await Authentication.checkIsSeedlessPasswordOutdated(true);
      if (isSeedlessPwdOutdated) {
        // no need to handle error here, password outdated state will trigger modal that force user to log out
        setLoading(false);
        return;
      }

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
      switch ((e as Error)?.message) {
        case 'This mnemonic has already been imported.':
          Alert.alert(
            strings('import_new_secret_recovery_phrase.error_duplicate_srp'),
          );
          break;
        case 'KeyringController - The account you are trying to import is a duplicate':
          Alert.alert(
            strings(
              'import_new_secret_recovery_phrase.error_duplicate_account',
            ),
          );
          break;
        default:
          Alert.alert(
            strings('import_new_secret_recovery_phrase.error_title'),
            strings('import_new_secret_recovery_phrase.error_message'),
          );
      }
      setLoading(false);
    }
  };

  const content = (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.mainWrapper}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.wrapper}
        testID={ImportSRPIDs.CONTAINER}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        bottomOffset={180}
        showsVerticalScrollIndicator={false}
      >
        <Text
          variant={TextVariant.DisplayMD}
          style={styles.title}
          testID={ImportSRPIDs.SCREEN_TITLE_ID}
        >
          {strings('import_new_secret_recovery_phrase.import_wallet_title')}
        </Text>

        <View style={styles.contentContainer}>
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

          <SrpInputGrid
            ref={srpInputGridRef}
            seedPhrase={seedPhrase}
            onSeedPhraseChange={setSeedPhrase}
            onError={setError}
            externalError={error}
            testIdPrefix={ImportSRPIDs.SEED_PHRASE_INPUT_ID}
            placeholderText={strings(
              'import_new_secret_recovery_phrase.textarea_placeholder',
            )}
            uniqueId={uniqueId}
            onCurrentWordChange={setCurrentInputWord}
          />

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
      {isSrpWordSuggestionsEnabled && isKeyboardVisible && (
        <KeyboardStickyView
          offset={{ closed: 0, opened: 0 }}
          style={styles.keyboardStickyView}
        >
          <SrpWordSuggestions
            currentInputWord={currentInputWord}
            onSuggestionSelect={(word) => {
              srpInputGridRef.current?.handleSuggestionSelect(word);
            }}
          />
        </KeyboardStickyView>
      )}
      <ScreenshotDeterrent enabled isSRP />
    </SafeAreaView>
  );

  return <KeyboardProvider>{content}</KeyboardProvider>;
};

export default ImportNewSecretRecoveryPhrase;
