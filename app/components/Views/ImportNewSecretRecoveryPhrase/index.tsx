import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  useContext,
} from 'react';
import {
  Alert,
  TouchableOpacity,
  TextInput,
  View,
  ActivityIndicator,
  DimensionValue,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import StyledButton from '../../UI/StyledButton';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import { useAppTheme } from '../../../util/theme';
import { createStyles } from './styles';
import { ImportSRPIDs } from '../../../../e2e/selectors/MultiSRP/SRPImport.selectors';
import { importNewSecretRecoveryPhrase } from '../../../actions/multiSrp';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { ButtonSize } from '../../../component-library/components/Buttons/Button';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { isValidMnemonic } from '../../../util/validators';
import useCopyClipboard from '../Notifications/Details/hooks/useCopyClipboard';
import ClipboardManager from '../../../core/ClipboardManager';
import BannerAlert from '../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../component-library/components/Banners/Banner';
import SelectComponent from '../../UI/SelectComponent';
import {
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import { useSelector } from 'react-redux';
import { selectHDKeyrings } from '../../../selectors/keyringController';

const defaultNumberOfWords = 12;

export const parseSecretRecoveryPhrase = (seedPhrase: string) =>
  (seedPhrase || '').trim().toLowerCase().match(/\w+/gu)?.join(' ') || '';

const srpOptions = [
  {
    value: 12,
    label: strings('import_new_secret_recovery_phrase.12_word_option'),
  },
  {
    value: 24,
    label: strings('import_new_secret_recovery_phrase.24_word_option'),
  },
];

/**
 * View that's displayed when the user is trying to import a new secret recovery phrase
 */
const ImportNewSecretRecoveryPhrase = () => {
  const [inputWidth, setInputWidth] = useState<DimensionValue | undefined>(
    Device.isAndroid() ? '99%' : undefined,
  );
  const navigation = useNavigation();
  const mounted = useRef<boolean>(false);
  const { colors, themeAppearance } = useAppTheme();
  const styles = createStyles(colors);
  const { toastRef } = useContext(ToastContext);

  const [numberOfWords, setNumberOfWords] = useState(defaultNumberOfWords);
  const [secretRecoveryPhrase, setSecretRecoveryPhrase] = useState<string[]>(
    Array(numberOfWords).fill(''),
  );
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [srpError, setSrpError] = useState('');
  const [invalidSRPWords, setInvalidSRPWords] = useState<boolean[]>(
    Array(numberOfWords).fill(false),
  );
  const hdKeyrings = useSelector(selectHDKeyrings);

  const copyToClipboard = useCopyClipboard();

  useEffect(() => {
    mounted.current = true;
    // Workaround https://github.com/facebook/react-native/issues/9958
    if (inputWidth) {
      const timeoutId = setTimeout(() => {
        mounted.current && setInputWidth('100%');
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        mounted.current = false;
      };
    }
  }, [inputWidth]);

  const hasUpperCase = (draftSrp: string) =>
    draftSrp !== draftSrp.toLowerCase();

  const hasEmptySrp = useMemo(
    () => secretRecoveryPhrase.every((word) => word === ''),
    [secretRecoveryPhrase],
  );

  const isValidSrp = isValidMnemonic(secretRecoveryPhrase.join(' '));

  // This is to keep the dropdown value in sync with the number of words when a user
  // pasted their srp
  const selectedDropdownValue = useMemo(
    () => srpOptions.find((option) => option.value === numberOfWords)?.value,
    [numberOfWords],
  );

  const handleSrpNumberChange = (value: number) => {
    if (value === numberOfWords) {
      return;
    }

    setNumberOfWords(value);
    setSecretRecoveryPhrase(Array(value).fill(''));
    setInvalidSRPWords(Array(value).fill(false));
    setSrpError('');
  };

  const onSrpChange = useCallback(
    (newDraftSrp: string[]) => {
      const validateSRP = (phrase: string[], words: boolean[]) => {
        if (!phrase.some((word) => word !== '')) {
          return { error: '', words };
        }

        const state = {
          error: '',
          words: phrase.map((word) => !wordlist.includes(word)),
        };

        return state;
      };

      const validateCompleteness = (
        state: { error: string; words: boolean[] },
        phrase: string[],
      ) => {
        if (state.error) {
          return state;
        }
        if (phrase.some((word) => word === '')) {
          return {
            ...state,
            error: strings(
              'import_new_secret_recovery_phrase.error_number_of_words_error_message',
            ),
          };
        }
        return state;
      };

      const validateCase = (
        state: { error: string; words: boolean[] },
        phrase: string,
      ) => {
        if (state.error) {
          return state;
        }
        if (hasUpperCase(phrase)) {
          return {
            ...state,
            error: strings(
              'import_new_secret_recovery_phrase.error_srp_is_case_sensitive',
            ),
          };
        }
        return state;
      };

      const validateWords = (state: { error: string; words: boolean[] }) => {
        if (state.error) {
          return state;
        }

        const invalidWordIndices = state.words
          .map((invalid, index) => (invalid ? index + 1 : 0))
          .filter((index) => index !== 0);

        if (invalidWordIndices.length === 0) {
          return state;
        }
        if (invalidWordIndices.length === 1) {
          return {
            ...state,
            error: `${strings(
              'import_new_secret_recovery_phrase.error_srp_word_error_1',
            )}${invalidWordIndices[0]}${strings(
              'import_new_secret_recovery_phrase.error_srp_word_error_2',
            )}`,
          };
        }

        const lastIndex = invalidWordIndices.pop();
        const firstPart = invalidWordIndices.join(', ');
        return {
          ...state,
          error: `${strings(
            'import_new_secret_recovery_phrase.error_multiple_srp_word_error_1',
          )}${firstPart}${strings(
            'import_new_secret_recovery_phrase.error_multiple_srp_word_error_2',
          )}${lastIndex}${strings(
            'import_new_secret_recovery_phrase.error_multiple_srp_word_error_3',
          )}`,
        };
      };

      const validateMnemonic = (
        state: { error: string; words: boolean[] },
        phrase: string,
      ) => {
        if (state.error) {
          return state;
        }
        if (!isValidMnemonic(phrase)) {
          return {
            ...state,
            error: strings(
              'import_new_secret_recovery_phrase.error_invalid_srp',
            ),
          };
        }
        return state;
      };

      const joinedDraftSrp = newDraftSrp.join(' ').trim();
      const invalidWords = Array(newDraftSrp.length).fill(false);
      let validationResult = validateSRP(newDraftSrp, invalidWords);
      validationResult = validateCompleteness(validationResult, newDraftSrp);
      validationResult = validateCase(validationResult, joinedDraftSrp);
      validationResult = validateWords(validationResult);
      validationResult = validateMnemonic(validationResult, joinedDraftSrp);

      setSecretRecoveryPhrase(newDraftSrp);
      setSrpError(validationResult.error);
      setInvalidSRPWords(validationResult.words);
    },
    [setSrpError, setSecretRecoveryPhrase],
  );

  const onSrpPaste = useCallback(async () => {
    const rawSrp = await ClipboardManager.getString();
    const parsedSrp = parseSecretRecoveryPhrase(rawSrp);
    let newDraftSrp = parsedSrp.split(' ');
    let newNumberOfWords = numberOfWords;
    if (newDraftSrp.length !== numberOfWords) {
      if (newDraftSrp.length < 12) {
        newNumberOfWords = 12;
      } else if (newDraftSrp.length === 24) {
        newNumberOfWords = 24;
      } else {
        setSrpError(
          strings(
            'import_new_secret_recovery_phrase.error_number_of_words_error_message',
          ),
        );
      }
      setNumberOfWords(newNumberOfWords);
    }

    if (newDraftSrp.length < newNumberOfWords) {
      newDraftSrp = newDraftSrp.concat(
        new Array(newNumberOfWords - newDraftSrp.length).fill(''),
      );
    }
    onSrpChange(newDraftSrp);
    copyToClipboard('');
  }, [copyToClipboard, numberOfWords, onSrpChange]);

  const onSrpWordChange = useCallback(
    (index, newWord) => {
      const newSrp = secretRecoveryPhrase.slice();
      newSrp[index] = newWord.trim();
      onSrpChange(newSrp);
    },
    [secretRecoveryPhrase, onSrpChange],
  );

  const dismiss = () => {
    navigation.goBack();
  };

  const onSubmit = async () => {
    setLoading(true);
    try {
      await importNewSecretRecoveryPhrase(secretRecoveryPhrase.join(' '));
      setLoading(false);
      setSecretRecoveryPhrase(Array(numberOfWords).fill(''));
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
      navigation.navigate('WalletView');
    } catch (e) {
      Alert.alert(
        strings('import_new_secret_recovery_phrase.error_title'),
        strings('import_new_secret_recovery_phrase.error_message'),
      );
      setLoading(false);
    }
  };

  const onClear = () => {
    setSecretRecoveryPhrase(Array(numberOfWords).fill(''));
    setSrpError('');
    setInvalidSRPWords(Array(numberOfWords).fill(false));
  };

  return (
    <View style={styles.mainWrapper}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.wrapper}
        style={styles.topOverlay}
        resetScrollToCoords={{ x: 0, y: 0 }}
      >
        <View style={styles.content} testID={ImportSRPIDs.CONTAINER}>
          <TouchableOpacity onPress={dismiss} style={styles.navbarLeftButton}>
            <Icon
              name={IconName.ArrowLeft}
              size={IconSize.Sm}
              testID={ImportSRPIDs.BACK}
            />
          </TouchableOpacity>
          <Text variant={TextVariant.HeadingLG}>
            {strings('import_new_secret_recovery_phrase.title')}
          </Text>
          <TouchableOpacity
            style={styles.subheading}
            onPress={() => setShowPassword(!showPassword)}
          >
            <View style={styles.options}>
              <SelectComponent
                label={strings(
                  'import_new_secret_recovery_phrase.srp_number_of_words_option_title',
                )}
                selectedValue={selectedDropdownValue}
                onValueChange={handleSrpNumberChange}
                options={srpOptions}
                testID={ImportSRPIDs.SRP_SELECTION_DROPDOWN}
              />
            </View>
            <Icon
              name={showPassword ? IconName.Eye : IconName.EyeSlash}
              size={IconSize.Sm}
            />
          </TouchableOpacity>
          <View style={styles.grid}>
            {secretRecoveryPhrase.map((_, index) => (
              <View key={`cell-${index}`} style={styles.gridCell}>
                <Text style={styles.gridCellPrefix}>{`${index + 1}. `}</Text>
                <TextInput
                  style={{
                    ...styles.input,
                    borderColor: invalidSRPWords[index]
                      ? colors.error.default
                      : colors.border.muted,
                  }}
                  autoCapitalize="none"
                  keyboardAppearance={themeAppearance}
                  value={showPassword ? secretRecoveryPhrase[index] : '***'}
                  onChangeText={(value) => {
                    onSrpWordChange(index, value);
                  }}
                  secureTextEntry={!showPassword}
                  textContentType={showPassword ? 'none' : 'password'}
                  testID={`${ImportSRPIDs.SRP_INPUT_WORD_NUMBER}-${index + 1}`}
                />
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <ButtonLink
              size={ButtonSize.Lg}
              label={
                hasEmptySrp
                  ? strings('import_new_secret_recovery_phrase.paste')
                  : strings('import_new_secret_recovery_phrase.clear')
              }
              onPress={hasEmptySrp ? onSrpPaste : onClear}
              testID={ImportSRPIDs.PASTE_BUTTON}
            />
          </View>
        </View>
        {srpError && (
          <BannerAlert severity={BannerAlertSeverity.Error}>
            <Text>{srpError}</Text>
          </BannerAlert>
        )}
        <View style={styles.buttonWrapper}>
          <StyledButton
            containerStyle={styles.button}
            type={'confirm'}
            onPress={onSubmit}
            disabled={srpError || !isValidSrp}
            testID={ImportSRPIDs.IMPORT_BUTTON}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primary.inverse} />
            ) : (
              strings('import_new_secret_recovery_phrase.cta_text')
            )}
          </StyledButton>
        </View>
      </KeyboardAwareScrollView>
      <ScreenshotDeterrent enabled isSRP />
    </View>
  );
};

export default ImportNewSecretRecoveryPhrase;
