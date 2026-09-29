import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import {
  useNativeHeader,
  useNativeHeaderInset,
} from '../../hooks/useNativeHeader';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextField,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { connect } from 'react-redux';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import SecureContentView from '../../UI/SecureContentView';
import { strings } from '../../../../locales/i18n';
import { seedphraseBackedUp } from '../../../actions/user';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import {
  compareMnemonics,
  pickUniqueMissingWordSlots,
} from '../../../util/mnemonic';
import { MetaMetricsEvents } from '../../../core/Analytics';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import Routes from '../../../constants/navigation/Routes';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { CommonActions } from '@react-navigation/native';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../constants/onboarding';
import { TraceName, endTrace } from '../../../util/trace';
import { OnboardingScreenIds } from '../../../hooks/performance/onboardingPerformanceIds';
import { useScreenPerformance } from '../../../hooks/performance/useScreenPerformance';
import ManualBackupConfirmErrorSheet from './ManualBackupConfirmErrorSheet';

const HIDDEN_WORD_MASK_CHARACTER = '•';
const HIDDEN_WORD_MASK_LENGTH_SINGLE_DIGIT = 6;
const HIDDEN_WORD_MASK_LENGTH_DOUBLE_DIGIT = 5;

const ManualBackupStep2 = ({
  navigation,
  seedphraseBackedUp,
  route,
  saveOnboardingEvent,
}) => {
  const words = route?.params?.words;
  const backupFlow = route?.params?.backupFlow;
  const settingsBackup = route?.params?.settingsBackup;

  const tw = useTailwind();
  const isNativeHeader = useNativeHeader();
  const nativeHeaderInset = useNativeHeaderInset();

  const [gridWords, setGridWords] = useState([]);
  const [emptySlots, setEmptySlots] = useState([]);
  const [missingWords, setMissingWords] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [usedWordIndices, setUsedWordIndices] = useState(new Set());
  const [wordPositionMap, setWordPositionMap] = useState({});
  const [isErrorSheetVisible, setIsErrorSheetVisible] = useState(false);
  const hasTriggeredValidationRef = useRef(false);

  useScreenPerformance({
    screenId: OnboardingScreenIds.MANUAL_BACKUP_STEP2,
    contentReady: true,
    isEmpty: false,
    fullyDisplayed: gridWords.length > 0,
  });

  const validateWords = useCallback(() => {
    const validWords = route.params?.words ?? [];
    return compareMnemonics(validWords, gridWords);
  }, [route.params?.words, gridWords]);

  const areAllWordsPlaced = useMemo(() => {
    const validWords = route.params?.words ?? [];
    return (
      validWords.length > 0 &&
      gridWords.filter((word) => word !== '').length === validWords.length
    );
  }, [route.params?.words, gridWords]);

  const { isEnabled: isMetricsEnabled } = useAnalytics();

  const goNext = useCallback(() => {
    if (validateWords()) {
      seedphraseBackedUp();
      if (backupFlow || settingsBackup) {
        const resetAction = CommonActions.reset({
          index: 0,
          routes: [
            {
              name: Routes.ONBOARDING.SUCCESS_FLOW,
              params: {
                screen: Routes.ONBOARDING.SUCCESS,
                params: {
                  successFlow: backupFlow
                    ? ONBOARDING_SUCCESS_FLOW.REMINDER_BACKUP
                    : ONBOARDING_SUCCESS_FLOW.SETTINGS_BACKUP,
                },
              },
            },
          ],
        });
        navigation.dispatch(resetAction);
      } else {
        const resetAction = CommonActions.reset({
          index: 0,
          routes: [
            {
              name: Routes.ONBOARDING.SUCCESS_FLOW,
              params: {
                screen: Routes.ONBOARDING.SUCCESS,
                params: {
                  successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
                },
              },
            },
          ],
        });
        endTrace({ name: TraceName.OnboardingNewSrpCreateWallet });
        endTrace({ name: TraceName.OnboardingJourneyOverall });

        if (isMetricsEnabled()) {
          navigation.dispatch(resetAction);
        } else {
          navigation.navigate('OptinMetrics', {
            successFlow: ONBOARDING_SUCCESS_FLOW.BACKED_UP_SRP,
            accountType: AccountType.Metamask,
          });
        }
      }
      trackOnboarding(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.WALLET_SECURITY_PHRASE_CONFIRMED,
        ).build(),
        saveOnboardingEvent,
      );
    }
  }, [
    backupFlow,
    isMetricsEnabled,
    navigation,
    saveOnboardingEvent,
    seedphraseBackedUp,
    settingsBackup,
    validateWords,
  ]);

  const generateMissingWords = useCallback(() => {
    const emptySlotsIndexes = pickUniqueMissingWordSlots(words);
    const tempGrid = [...words];
    const removed = emptySlotsIndexes.map((i) => {
      const word = tempGrid[i];
      tempGrid[i] = '';
      return word;
    });

    hasTriggeredValidationRef.current = false;
    setIsErrorSheetVisible(false);
    setGridWords(tempGrid);
    setMissingWords(removed);
    setEmptySlots(emptySlotsIndexes);
    const sortedIndexes = [...emptySlotsIndexes].sort((a, b) => a - b);
    setSelectedSlot(sortedIndexes[0]);
    setUsedWordIndices(new Set());
    setWordPositionMap({});
  }, [words]);

  useEffect(() => {
    generateMissingWords();
  }, [generateMissingWords]);

  const handleWordSelect = useCallback(
    (word, wordIndex) => {
      const updatedGrid = [...gridWords];

      if (usedWordIndices.has(wordIndex)) {
        return;
      }

      if (!missingWords.includes(word)) return;

      const emptySlotsUpdated = [...emptySlots]
        .sort((a, b) => a - b)
        .filter((idx) => updatedGrid[idx] === '');

      let targetIndex = selectedSlot;

      if (
        targetIndex === null ||
        updatedGrid[targetIndex] !== '' ||
        !emptySlotsUpdated.includes(targetIndex)
      ) {
        targetIndex = emptySlotsUpdated[0];
      }

      if (targetIndex === undefined) return;

      const newGrid = [...updatedGrid];
      newGrid[targetIndex] = word;
      setGridWords(newGrid);

      const newUsedIndices = new Set(usedWordIndices);
      newUsedIndices.add(wordIndex);
      setUsedWordIndices(newUsedIndices);

      const newPositionMap = { ...wordPositionMap };
      newPositionMap[targetIndex] = wordIndex;
      setWordPositionMap(newPositionMap);

      const nextEmptySlot =
        emptySlotsUpdated.find((slot) => slot > targetIndex) ||
        emptySlotsUpdated[0];
      setSelectedSlot(nextEmptySlot);
    },
    [
      gridWords,
      missingWords,
      selectedSlot,
      emptySlots,
      usedWordIndices,
      wordPositionMap,
    ],
  );

  const handleSlotPress = useCallback(
    (index) => {
      if (!emptySlots.includes(index)) return;

      const isFilled = gridWords[index] !== '';
      const updated = [...gridWords];

      if (isFilled) {
        updated[index] = '';
        setGridWords(updated);
        hasTriggeredValidationRef.current = false;

        const wordIndexToRemove = wordPositionMap[index];
        if (wordIndexToRemove !== undefined) {
          const newUsedIndices = new Set(usedWordIndices);
          newUsedIndices.delete(wordIndexToRemove);
          setUsedWordIndices(newUsedIndices);
        }

        const newPositionMap = { ...wordPositionMap };
        delete newPositionMap[index];
        setWordPositionMap(newPositionMap);

        setSelectedSlot(index);
      } else {
        setSelectedSlot(index);
      }
    },
    [emptySlots, gridWords, wordPositionMap, usedWordIndices],
  );

  const renderGridItem = useCallback(
    (item, index) => {
      const isEmpty = emptySlots.includes(index);
      const isSelected = isEmpty && selectedSlot === index;
      const maskLength =
        index + 1 < 10
          ? HIDDEN_WORD_MASK_LENGTH_SINGLE_DIGIT
          : HIDDEN_WORD_MASK_LENGTH_DOUBLE_DIGIT;
      const displayValue = isEmpty
        ? item
        : HIDDEN_WORD_MASK_CHARACTER.repeat(maskLength);

      return (
        <Pressable
          key={index}
          disabled={!isEmpty}
          testID={
            isEmpty
              ? `${ManualBackUpStepsSelectorsIDs.GRID_ITEM_EMPTY}-${index}`
              : `${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-${index}`
          }
          style={tw.style('w-[31%] mb-2')}
          onPress={() => handleSlotPress(index)}
        >
          <TextField
            isReadOnly
            isDisabled={!isEmpty}
            value={displayValue}
            pointerEvents="none"
            twClassName={isSelected ? 'border-icon-default' : undefined}
            startAccessory={
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                maxFontSizeMultiplier={1}
              >
                {index + 1}.
              </Text>
            }
            inputProps={{
              caretHidden: true,
              showSoftInputOnFocus: false,
              maxFontSizeMultiplier: 1,
              lineBreakModeIOS: 'clip',
            }}
          />
        </Pressable>
      );
    },
    [emptySlots, handleSlotPress, selectedSlot, tw],
  );

  const renderGrid = useCallback(
    () => (
      <SecureContentView>
        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="flex-wrap justify-between"
        >
          {gridWords.map((item, index) => renderGridItem(item, index))}
        </Box>
      </SecureContentView>
    ),
    [gridWords, renderGridItem],
  );

  const renderMissingWords = useCallback(
    () => (
      <SecureContentView>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Center}
          twClassName="gap-2"
        >
          {missingWords.map((word, i) => {
            const isUsed = usedWordIndices.has(i);
            return (
              <Button
                key={`${word}-${i}`}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                isDisabled={isUsed}
                testID={`${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${i}`}
                onPress={() => handleWordSelect(word, i)}
                twClassName="flex-1 rounded-[12px]"
                textProps={{
                  testID: `${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-${i}`,
                }}
              >
                {word}
              </Button>
            );
          })}
        </Box>
      </SecureContentView>
    ),
    [missingWords, usedWordIndices, handleWordSelect],
  );

  const handleErrorSheetDismiss = useCallback(() => {
    setIsErrorSheetVisible(false);
    generateMissingWords();
  }, [generateMissingWords]);

  const validateSeedPhrase = useCallback(() => {
    const isSuccess = validateWords();
    if (isSuccess) {
      trackOnboarding(
        AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.WALLET_SECURITY_COMPLETED,
        ).build(),
        saveOnboardingEvent,
      );
      goNext();
      return;
    }

    setIsErrorSheetVisible(true);
  }, [goNext, saveOnboardingEvent, validateWords]);

  useEffect(() => {
    if (!areAllWordsPlaced || hasTriggeredValidationRef.current) {
      return;
    }
    hasTriggeredValidationRef.current = true;
    validateSeedPhrase();
  }, [areAllWordsPlaced, validateSeedPhrase]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      {!isNativeHeader && (
        <HeaderStandard
          includesTopInset
          onBack={() => navigation.goBack()}
          backButtonProps={{
            testID: ManualBackUpStepsSelectorsIDs.BACK_BUTTON,
          }}
        />
      )}
      <Box
        twClassName="flex-1 px-4 gap-4"
        style={tw.style({ paddingTop: nativeHeaderInset })}
        testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
      >
        <TitleStandard
          title={strings('manual_backup_step_2.action')}
          bottomLabel={strings('manual_backup_step_2.info')}
        />
        <Box twClassName="flex-1 gap-4">
          {renderGrid()}
          {renderMissingWords()}
        </Box>
      </Box>
      <ScreenshotDeterrent enabled isSRP />
      <ManualBackupConfirmErrorSheet
        isVisible={isErrorSheetVisible}
        onDismiss={handleErrorSheetDismiss}
      />
    </SafeAreaView>
  );
};

ManualBackupStep2.propTypes = {
  /**
   * Navigation object used for moving between screens.
   */
  navigation: PropTypes.object,
  /**
   * Redux action that marks the SRP as backed up.
   */
  seedphraseBackedUp: PropTypes.func,
  /**
   * Current route object with params.
   */
  route: PropTypes.object,
  /**
   * Action to persist onboarding metrics events.
   */
  saveOnboardingEvent: PropTypes.func,
};

const mapDispatchToProps = (dispatch) => ({
  seedphraseBackedUp: () => dispatch(seedphraseBackedUp()),
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(ManualBackupStep2);
