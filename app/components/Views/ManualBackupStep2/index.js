import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Alert,
  TouchableOpacity,
  FlatList,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { connect } from 'react-redux';
import ActionView from '../../UI/ActionView';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { strings } from '../../../../locales/i18n';
import { seedphraseBackedUp } from '../../../actions/user';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { compareMnemonics } from '../../../util/mnemonic';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useTheme } from '../../../util/theme';
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Routes from '../../../constants/navigation/Routes';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { CommonActions } from '@react-navigation/native';
import {
  AccountType,
  ONBOARDING_SUCCESS_FLOW,
} from '../../../constants/onboarding';
import { TraceName, endTrace } from '../../../util/trace';

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
  const { colors } = useTheme();
  const { width: innerWidth, height: windowHeight } = useWindowDimensions();

  const [gridWords, setGridWords] = useState([]);
  const [emptySlots, setEmptySlots] = useState([]);
  const [missingWords, setMissingWords] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [usedWordIndices, setUsedWordIndices] = useState(new Set());
  const [wordPositionMap, setWordPositionMap] = useState({});

  const headerLeft = useCallback(
    () => (
      <TouchableOpacity
        testID={ManualBackUpStepsSelectorsIDs.BACK_BUTTON}
        onPress={() => navigation.goBack()}
      >
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          color={IconColor.IconDefault}
          style={tw.style('ml-4')}
        />
      </TouchableOpacity>
    ),
    [navigation, tw],
  );

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getOnboardingNavbarOptions(route, { headerLeft }, colors, false),
    );
  }, [colors, navigation, route, headerLeft]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const validateWords = useCallback(() => {
    const validWords = route.params?.words ?? [];
    return compareMnemonics(validWords, gridWords);
  }, [route.params?.words, gridWords]);

  const areAllWordsPlaced = useMemo(() => {
    const validWords = route.params?.words ?? [];
    return gridWords.filter((word) => word !== '').length === validWords.length;
  }, [route.params?.words, gridWords]);

  const { isEnabled: isMetricsEnabled } = useAnalytics();

  const goNext = () => {
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
            onContinue: () => {
              navigation.dispatch(resetAction);
            },
            accountType: AccountType.Metamask,
          });
        }
      }
      trackOnboarding(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.WALLET_SECURITY_PHRASE_CONFIRMED,
        ).build(),
        saveOnboardingEvent,
      );
    } else {
      Alert.alert(
        strings('account_backup_step_5.error_title'),
        strings('account_backup_step_5.error_message'),
      );
    }
  };

  const generateMissingWords = useCallback(() => {
    const rows = [0, 1, 2, 3];
    const sortGridRows = rows.sort(() => 0.5 - Math.random());
    const selectRandomSlots = sortGridRows.slice(0, 3);
    const emptySlotsIndexes = selectRandomSlots.map((row) => {
      const col = Math.floor(Math.random() * 3);
      return row * 3 + col;
    });

    const tempGrid = [...words];
    const removed = [];

    emptySlotsIndexes.forEach((i) => {
      removed.push(tempGrid[i]);
      tempGrid[i] = '';
    });

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
        const positionToRemove = Object.keys(wordPositionMap).find(
          (pos) => wordPositionMap[pos] === wordIndex,
        );

        if (positionToRemove !== undefined) {
          const newGrid = [...updatedGrid];
          newGrid[parseInt(positionToRemove, 10)] = '';
          setGridWords(newGrid);
          setSelectedSlot(parseInt(positionToRemove, 10));

          const newUsedIndices = new Set(usedWordIndices);
          newUsedIndices.delete(wordIndex);
          setUsedWordIndices(newUsedIndices);

          const newPositionMap = { ...wordPositionMap };
          delete newPositionMap[positionToRemove];
          setWordPositionMap(newPositionMap);
        }
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

  const renderGridItemText = useCallback(
    (item, index, isEmpty) => (
      <>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          maxFontSizeMultiplier={1}
        >
          {index + 1}.
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          twClassName="w-[95%]"
          maxFontSizeMultiplier={1}
        >
          {isEmpty ? item : '••••••'}
        </Text>
      </>
    ),
    [],
  );

  const renderGridItem = useCallback(
    ({ item, index }) => {
      const isEmpty = emptySlots.includes(index);
      const isSelected = selectedSlot === index;

      return (
        <TouchableOpacity
          key={index}
          testID={
            isEmpty
              ? `${ManualBackUpStepsSelectorsIDs.GRID_ITEM_EMPTY}-${index}`
              : `${ManualBackUpStepsSelectorsIDs.GRID_ITEM}-${index}`
          }
          style={tw.style(
            'py-1 px-2 rounded-lg bg-default border border-muted flex-row items-center justify-start h-10 opacity-50',
            Platform.OS === 'ios' ? 'gap-1 m-1' : 'gap-[3px] m-[3px]',
            isEmpty && 'bg-default opacity-100 border-2 border-default',
            isSelected && 'border-2 border-primary-default',
            { width: innerWidth / 3.85 },
          )}
          onPress={() => handleSlotPress(index)}
        >
          {renderGridItemText(item, index, isEmpty)}
        </TouchableOpacity>
      );
    },
    [
      emptySlots,
      handleSlotPress,
      innerWidth,
      renderGridItemText,
      selectedSlot,
      tw,
    ],
  );

  const renderGrid = useCallback(
    () => (
      <Box twClassName="bg-muted rounded-[10px] mb-4 p-4 gap-1">
        <FlatList
          data={gridWords}
          numColumns={3}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderGridItem}
        />
      </Box>
    ),
    [gridWords, renderGridItem],
  );

  const renderMissingWords = useCallback(
    () => (
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-wrap"
      >
        {missingWords.map((word, i) => {
          const isUsed = usedWordIndices.has(i);
          return (
            <TouchableOpacity
              key={`${word}-${i}`}
              testID={`${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${i}`}
              style={tw.style(
                'py-1 px-2 m-2 rounded-lg bg-default border border-primary-default flex-row items-center justify-center h-10',
                isUsed && 'bg-alternative border-0',
                { width: innerWidth / 3.9 },
              )}
              onPress={() => handleWordSelect(word, i)}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={
                  isUsed ? TextColor.TextAlternative : TextColor.PrimaryDefault
                }
                testID={`${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-${i}`}
                maxFontSizeMultiplier={1}
              >
                {word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Box>
    ),
    [missingWords, usedWordIndices, innerWidth, handleWordSelect, tw],
  );

  const validateSeedPhrase = () => {
    const isSuccess = validateWords();
    if (isSuccess) {
      trackOnboarding(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.WALLET_SECURITY_COMPLETED,
        ).build(),
        saveOnboardingEvent,
      );
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          title: strings('manual_backup_step_2.success-title'),
          description: strings('manual_backup_step_2.success-description'),
          primaryButtonLabel: strings('manual_backup_step_2.success-button'),
          type: 'success',
          onClose: () => goNext(),
          onPrimaryButtonPress: () => goNext(),
          closeOnPrimaryButtonPress: true,
        },
      });
    } else {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          title: strings('manual_backup_step_2.error-title'),
          description: strings('manual_backup_step_2.error-description'),
          primaryButtonLabel: strings('manual_backup_step_2.error-button'),
          type: 'error',
          onClose: () => generateMissingWords(),
          onPrimaryButtonPress: () => generateMissingWords(),
          closeOnPrimaryButtonPress: true,
        },
      });
    }
  };

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
    >
      <Box twClassName="flex-1 px-4">
        <ActionView
          confirmTestID={ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON}
          confirmText={strings('manual_backup_step_2.continue')}
          onConfirmPress={validateSeedPhrase}
          confirmDisabled={!areAllWordsPlaced}
          showCancelButton={false}
          confirmButtonMode={'confirm'}
          buttonContainerStyle={tw.style(
            'px-0',
            Platform.OS === 'android' && 'mb-4',
          )}
          contentContainerStyle={tw.style('flex-1')}
        >
          <Box
            justifyContent={BoxJustifyContent.SpaceBetween}
            twClassName="flex-1 h-full gap-y-4"
            testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
          >
            <Box
              justifyContent={BoxJustifyContent.SpaceBetween}
              twClassName="flex-1 gap-y-4"
              style={{ height: windowHeight - 290 }}
            >
              <Text
                variant={TextVariant.DisplayMd}
                color={TextColor.TextDefault}
              >
                {strings('manual_backup_step_2.action')}
              </Text>

              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('manual_backup_step_2.info')}
              </Text>

              <Box twClassName="flex-1 gap-1">
                {renderGrid()}
                {renderMissingWords()}
              </Box>
            </Box>
          </Box>
        </ActionView>
      </Box>
      <ScreenshotDeterrent enabled isSRP />
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
