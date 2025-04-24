import React, { useEffect, useState, useCallback } from 'react';
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

const ManualBackupStep2 = ({ navigation, seedphraseBackedUp, route }) => {
  const words = route.params?.words;
  const backupFlow = route.params?.backupFlow;

  // eslint-disable-next-line no-console
  console.log('backupFlow', backupFlow);

  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [showStatusBottomSheet, setShowStatusBottomSheet] = useState(false);
  const [gridWords, setGridWords] = useState([]);
  const [emptySlots, setEmptySlots] = useState([]);
  const [missingWords, setMissingWords] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [sortedSlots, setSortedSlots] = useState([]);

  const updateNavBar = useCallback(() => {
    navigation.setOptions(
      getOnboardingNavbarOptions(
        route,
        {
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon
                name={IconName.ArrowLeft}
                size={IconSize.Lg}
                color={colors.text.default}
                style={styles.headerLeft}
              />
            </TouchableOpacity>
          ),
        },
        colors,
        false,
      ),
    );
  }, [colors, navigation, route, styles.headerLeft]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const validateWords = useCallback(() => {
    const validWords = route.params?.words ?? [];
    return compareMnemonics(validWords, gridWords);
  }, [route.params?.words, gridWords]);

  const isAllWordsPlaced = useCallback(() => {
    const validWords = route.params?.words ?? [];
    return gridWords.filter((word) => word !== '').length === validWords.length;
  }, [route.params?.words, gridWords]);

  const goNext = () => {
    if (validateWords()) {
      seedphraseBackedUp();
      InteractionManager.runAfterInteractions(async () => {
        backupFlow
          ? navigation.navigate('OptinMetrics', {
              onContinue: () => {
                navigation.reset({ routes: [{ name: 'HomeNav' }] });
              },
            })
          : navigation.navigate('OptinMetrics', {
              steps: route.params?.steps,
              words,
              onContinue: () => {
                navigation.navigate('OnboardingSuccess', {
                  showPasswordHint: true,
                });
              },
            });
        trackOnboarding(
          MetricsEventBuilder.createEventBuilder(
            MetaMetricsEvents.WALLET_SECURITY_PHRASE_CONFIRMED,
          ).build(),
        );
      });
    } else {
      Alert.alert(
        strings('account_backup_step_5.error_title'),
        strings('account_backup_step_5.error_message'),
      );
    }
  };

  useEffect(() => {
    if (showStatusBottomSheet) return;

    const rows = [0, 1, 2, 3];
    const randomRows = rows.sort(() => 0.5 - Math.random()).slice(0, 3);
    const indexesToEmpty = randomRows.map((row) => {
      const col = Math.floor(Math.random() * 3);
      return row * 3 + col;
    });

    const tempGrid = [...words];
    const removed = [];

    indexesToEmpty.forEach((i) => {
      removed.push(tempGrid[i]);
      tempGrid[i] = '';
    });

    setGridWords(tempGrid);
    setMissingWords(removed);
    setEmptySlots(indexesToEmpty);
    const sortedIndexes = indexesToEmpty.sort((a, b) => a - b);
    setSortedSlots(indexesToEmpty.filter((_, i) => i !== 0));
    setSelectedSlot(sortedIndexes[0]);
  }, [words, showStatusBottomSheet]);

  const handleWordSelect = useCallback(
    (word) => {
      const updatedGrid = [...gridWords];
      if (sortedSlots.length === 0) {
        const indexesToEmpty = [...emptySlots];
        const sortedIndexes = indexesToEmpty.sort((a, b) => a - b);
        setSortedSlots(sortedIndexes);
      }

      // Step 1: Deselect if already placed
      const existingIndex = updatedGrid.findIndex((w) => w === word);
      if (existingIndex !== -1) {
        updatedGrid[existingIndex] = '';
        setGridWords(updatedGrid);

        // Clear selection completely if this was the last word
        const remaining = updatedGrid.filter((w) => w !== '');
        setSelectedSlot(remaining.length === 0 ? null : null); // ← always reset for top-down behavior
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

  const renderGrid = useCallback(
    () => (
      <>
        <View style={[styles.seedPhraseContainer]}>
          <FlatList
            data={gridWords}
            numColumns={3}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => {
              // eslint-disable-next-line no-console
              const isEmpty = emptySlots.includes(index);
              const isSelected = selectedSlot === index;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.gridItem,
                    isEmpty && styles.emptySlot,
                    isSelected && styles.selectedSlotBox,
                    { width: innerWidth / 3.8 },
                  ]}
                  onPress={() => handleSlotPress(index)}
                >
                  <Text style={styles.gridItemIndex}>{index + 1}.</Text>
                  <Text style={styles.gridItemText}>
                    {isEmpty ? item : '••••••'}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </>
    ),
    [
      styles.seedPhraseContainer,
      styles.gridItem,
      styles.emptySlot,
      styles.selectedSlotBox,
      gridWords,
      emptySlots,
      selectedSlot,
      innerWidth,
      handleSlotPress,
      styles.gridItemIndex,
      styles.gridItemText,
    ],
  );

  // const allPlaced = missingWords.every((word) => gridWords.includes(word));

  const renderMissingWords = useCallback(
    () => (
      <View style={styles.missingWords}>
        {missingWords.map((word, i) => {
          const isUsed = gridWords.includes(word);
          return (
            <TouchableOpacity
              key={i}
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
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: validateWords()
          ? strings('manual_backup_step_2.success-title')
          : strings('manual_backup_step_2.error-title'),
        description: validateWords()
          ? strings('manual_backup_step_2.success-description')
          : strings('manual_backup_step_2.error-description'),
        buttonLabel: validateWords()
          ? strings('manual_backup_step_2.success-button')
          : strings('manual_backup_step_2.error-button'),
        type: validateWords() ? 'success' : 'error',
        onClose: () => setShowStatusBottomSheet((prev) => !prev),
        onButtonPress: validateWords()
          ? goNext
          : () => setShowStatusBottomSheet((prev) => !prev),
      },
    });
  };

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <View style={[styles.container]}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          Step 3 of 3
        </Text>
        <ActionView
          confirmTestID={ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON}
          confirmText={strings('manual_backup_step_2.continue')}
          onConfirmPress={validateSeedPhrase}
          confirmDisabled={!isAllWordsPlaced()}
          showCancelButton={false}
          confirmButtonMode={'confirm'}
          buttonContainerStyle={styles.buttonContainer}
          rootStyle={styles.actionView}
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
};

const mapDispatchToProps = (dispatch) => ({
  seedphraseBackedUp: () => dispatch(seedphraseBackedUp()),
});

export default connect(null, mapDispatchToProps)(ManualBackupStep2);
