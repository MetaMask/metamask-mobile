import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  InteractionManager,
  Alert,
  TouchableOpacity,
  View,
  SafeAreaView,
  FlatList,
  Dimensions,
} from 'react-native';
import PropTypes from 'prop-types';
import ActionView from '../../UI/ActionView';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { seedphraseBackedUp } from '../../../actions/user';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { compareMnemonics } from '../../../util/mnemonic';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Routes from '../../../constants/navigation/Routes';
import { saveOnboardingEvent } from '../../../actions/onboarding';
import { useMetrics } from '../../hooks/useMetrics';
import { CommonActions } from '@react-navigation/native';
import { ONBOARDING_SUCCESS_FLOW } from '../../../constants/onboarding';

const ManualBackupStep2 = ({
  navigation,
  seedphraseBackedUp,
  route,
  dispatchSaveOnboardingEvent,
}) => {
  const words = route?.params?.words;
  const backupFlow = route?.params?.backupFlow;
  const settingsBackup = route?.params?.settingsBackup;

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [gridWords, setGridWords] = useState([]);
  const [emptySlots, setEmptySlots] = useState([]);
  const [missingWords, setMissingWords] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [sortedSlots, setSortedSlots] = useState([]);

  const headerLeft = useCallback(
    () => (
      <TouchableOpacity
        testID={ManualBackUpStepsSelectorsIDs.BACK_BUTTON}
        onPress={() => navigation.goBack()}
      >
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          color={colors.text.default}
          style={styles.headerLeft}
        />
      </TouchableOpacity>
    ),
    [colors, navigation, styles.headerLeft],
  );

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft,
        },
        colors,
        false,
      ),
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

  const { isEnabled: isMetricsEnabled } = useMetrics();
  const goNext = () => {
    if (validateWords()) {
      seedphraseBackedUp();
      InteractionManager.runAfterInteractions(async () => {
        if (backupFlow) {
          const resetToHomeNavAction = CommonActions.reset({
            index: 0,
            routes: [{ name: 'HomeNav' }],
          });
          navigation.dispatch(resetToHomeNavAction);
        } else if (settingsBackup) {
          navigation.navigate(Routes.ONBOARDING.SECURITY_SETTINGS);
        } else {
          const resetAction = CommonActions.reset({
            index: 0,
            routes: [
              {
                name: Routes.ONBOARDING.SUCCESS_FLOW,
                params: {
                  screen: Routes.ONBOARDING.SUCCESS,
                },
              },
            ],
          });
          if (isMetricsEnabled()) {
            navigation.dispatch(resetAction);
          } else {
            navigation.navigate('OptinMetrics', {
              onContinue: () => {
                navigation.dispatch(resetAction);
              },
            });
          }
        }
        trackOnboarding(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.WALLET_SECURITY_PHRASE_CONFIRMED,
          ).build(),
          dispatchSaveOnboardingEvent,
        );
      });
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
    const sortedIndexes = emptySlotsIndexes.sort((a, b) => a - b);
    setSortedSlots(emptySlotsIndexes.filter((_, i) => i !== 0));
    setSelectedSlot(sortedIndexes[0]);
  }, [words]);

  useEffect(() => {
    generateMissingWords();
  }, [generateMissingWords]);

  const handleWordSelect = useCallback(
    (word) => {
      const updatedGrid = [...gridWords];
      if (sortedSlots.length === 0) {
        const emptySlotsIndexes = [...emptySlots];
        const sortedIndexes = emptySlotsIndexes.sort((a, b) => a - b);
        setSortedSlots(sortedIndexes);
      }

      // Step 1: Deselect if already placed
      const existingIndex = updatedGrid.findIndex((w) => w === word);
      if (existingIndex !== -1) {
        updatedGrid[existingIndex] = '';
        setGridWords(updatedGrid);
        setSelectedSlot(null); // ← always reset for top-down behavior
        return;
      }

      // Word must be one of the missing ones
      if (!missingWords.includes(word)) return;

      // Get empty slots top-down
      const emptySlotsUpdated = updatedGrid
        .map((val, idx) => (val === '' ? idx : null))
        .filter((i) => i !== null);

      //  If user clicked a slot manually, use it
      let targetIndex = selectedSlot;

      // FINAL GUARD: Always prefer top-down first empty slot
      if (
        targetIndex === null || // no slot selected
        updatedGrid[targetIndex] !== '' || // slot already filled
        !emptySlotsUpdated.includes(targetIndex) // invalid slot
      ) {
        targetIndex = emptySlotsUpdated[0]; // force top-down
      }

      if (targetIndex === undefined) return;

      updatedGrid[targetIndex] = word;
      setGridWords(updatedGrid);
      setSelectedSlot(sortedSlots[0]); // reset selection after placing
      setSortedSlots(sortedSlots.filter((_, i) => i !== 0));
    },
    [gridWords, missingWords, selectedSlot, sortedSlots, emptySlots],
  );

  const handleSlotPress = useCallback(
    (index) => {
      if (!emptySlots.includes(index)) return;

      const isFilled = gridWords[index] !== '';
      const word = gridWords[index];

      const updated = [...gridWords];

      if (isFilled) {
        updated[index] = '';
        setGridWords(updated);

        const stillUsed = updated.includes(word);
        if (!stillUsed) setSelectedSlot(index); // reselect same slot
      } else {
        setSelectedSlot(index); // highlight this for next word
      }
    },
    [emptySlots, gridWords],
  );

  const innerWidth = Dimensions.get('window').width;

  const renderGridItemText = useCallback(
    (item, index, isEmpty) => (
      <>
        <Text style={styles.gridItemIndex}>{index + 1}.</Text>
        <Text style={styles.gridItemText}>{isEmpty ? item : '••••••'}</Text>
      </>
    ),
    [styles.gridItemIndex, styles.gridItemText],
  );

  const renderGridItem = useCallback(
    ({ item, index }) => {
      const isEmpty = emptySlots.includes(index);
      const isSelected = selectedSlot === index;

      return (
        <TouchableOpacity
          key={index}
          testID={ManualBackUpStepsSelectorsIDs.GRID_ITEM}
          style={[
            styles.gridItem,
            isEmpty && styles.emptySlot,
            isSelected && styles.selectedSlotBox,
            {
              width: innerWidth / 3.85,
            },
          ]}
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
      styles.emptySlot,
      styles.gridItem,
      styles.selectedSlotBox,
    ],
  );

  const renderGrid = useCallback(
    () => (
      <View style={[styles.seedPhraseContainer]}>
        <FlatList
          data={gridWords}
          numColumns={3}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderGridItem}
        />
      </View>
    ),
    [styles.seedPhraseContainer, gridWords, renderGridItem],
  );

  const renderMissingWords = useCallback(
    () => (
      <View style={styles.missingWords}>
        {missingWords.map((word, i) => {
          const isUsed = gridWords.includes(word);
          return (
            <TouchableOpacity
              key={word}
              testID={`${ManualBackUpStepsSelectorsIDs.MISSING_WORDS}-${i}`}
              style={[
                styles.missingWord,
                isUsed && styles.selectedWord,
                { width: innerWidth / 3.9 },
              ]}
              onPress={() => handleWordSelect(word)}
            >
              <Text
                variant={TextVariant.BodyMDMedium}
                color={isUsed ? TextColor.Default : TextColor.Primary}
                testID={`${ManualBackUpStepsSelectorsIDs.WORD_ITEM_MISSING}-${i}`}
              >
                {word}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    ),
    [
      styles.missingWords,
      styles.missingWord,
      styles.selectedWord,
      missingWords,
      gridWords,
      innerWidth,
      handleWordSelect,
    ],
  );

  const validateSeedPhrase = () => {
    const isSuccess = validateWords();
    if (isSuccess) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          title: strings('manual_backup_step_2.success-title'),
          description: strings('manual_backup_step_2.success-description'),
          primaryButtonLabel: strings('manual_backup_step_2.success-button'),
          type: 'success',
          onPrimaryButtonPress: goNext,
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
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <View style={[styles.container]}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('manual_backup_step_2.steps', {
            currentStep: 3,
            totalSteps: 3,
          })}
        </Text>
        <ActionView
          confirmTestID={ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON}
          confirmText={strings('manual_backup_step_2.continue')}
          onConfirmPress={validateSeedPhrase}
          confirmDisabled={!areAllWordsPlaced}
          showCancelButton={false}
          confirmButtonMode={'confirm'}
          buttonContainerStyle={styles.buttonContainer}
          contentContainerStyle={styles.actionView}
        >
          <View
            style={styles.wrapper}
            testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
          >
            <View style={styles.content}>
              <Text variant={TextVariant.DisplayMD} color={TextColor.Default}>
                {strings('manual_backup_step_2.action')}
              </Text>

              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('manual_backup_step_2.info')}
              </Text>

              <View style={styles.gridContainer}>
                {renderGrid()}
                {renderMissingWords()}
              </View>
            </View>
          </View>
        </ActionView>
      </View>
      <ScreenshotDeterrent enabled isSRP />
    </SafeAreaView>
  );
};

ManualBackupStep2.propTypes = {
  /**
  /* navigation object required to push and pop other views
  */
  navigation: PropTypes.object,
  /**
   * The action to update the seedphrase backed up flag
   * in the redux store
   */
  seedphraseBackedUp: PropTypes.func,
  /**
   * Object that represents the current route info like params passed to it
   */
  route: PropTypes.object,
  /**
   * Action to save onboarding event
   */
  dispatchSaveOnboardingEvent: PropTypes.func,
};

const mapDispatchToProps = (dispatch) => ({
  seedphraseBackedUp: () => dispatch(seedphraseBackedUp()),
  dispatchSaveOnboardingEvent: (...eventArgs) =>
    dispatch(saveOnboardingEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(ManualBackupStep2);
