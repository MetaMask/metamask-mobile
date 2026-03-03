import React, {
  useState,
  useCallback,
  useMemo,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import {
  KeyboardAwareScrollView,
  KeyboardProvider,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { strings } from '../../../../locales/i18n';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  IconName,
  IconColor,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { ImportSRPIDs } from './SRPImport.testIds';
import { importNewSecretRecoveryPhrase } from '../../../actions/multiSrp';
import { IconName as ComponentIconName } from '../../../component-library/components/Icons/Icon';
import HeaderStackedStandard from '../../../component-library/components-temp/HeaderStackedStandard';
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
  const tw = useTailwind();
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

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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

      await importNewSecretRecoveryPhrase(
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
        iconName: ComponentIconName.Check,
        hasNoTimeout: false,
      });

      fetchAccountsWithActivity();

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
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStackedStandard
        includesTopInset
        backButtonProps={{
          onPress: dismiss,
          testID: ImportSRPIDs.BACK,
        }}
        endButtonIconProps={[
          {
            iconName: IconName.Scan,
            onPress: onQrCodePress,
            testID: 'qr-code-button',
          },
        ]}
        titleStandardProps={{
          testID: ImportSRPIDs.SCREEN_TITLE_ID,
          title: strings(
            'import_new_secret_recovery_phrase.import_wallet_title',
          ),
          bottomAccessory: (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings(
                  'import_new_secret_recovery_phrase.enter_srp_subtitle',
                )}
              </Text>
              <ButtonIcon
                iconName={IconName.Info}
                iconProps={{
                  color: IconColor.IconAlternative,
                }}
                onPress={showWhatIsSeedPhrase}
                testID="info-icon"
              />
            </Box>
          ),
        }}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={tw.style(
          'flex-grow px-4',
          Platform.OS === 'android' ? 'pb-0' : 'pb-4',
        )}
        testID={ImportSRPIDs.CONTAINER}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        bottomOffset={180}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="flex-1">
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
            autoFocus={false}
          />
        </Box>
      </KeyboardAwareScrollView>
      <Box twClassName="px-4 py-4 bg-default">
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('import_new_secret_recovery_phrase.cta_text')}
          onPress={onSubmit}
          isDisabled={isSRPContinueButtonDisabled || loading}
          loading={loading}
          testID={ImportSRPIDs.IMPORT_BUTTON}
        />
      </Box>
      {isSrpWordSuggestionsEnabled && isKeyboardVisible && (
        <KeyboardStickyView
          offset={{ closed: 0, opened: 0 }}
          style={tw.style('absolute bottom-0 left-0 right-0')}
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
