import React, { useEffect, useState, useCallback } from 'react';
import {
  InteractionManager,
  Alert,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  FlatList,
} from 'react-native';
import PropTypes from 'prop-types';
import OnboardingProgress from '../../UI/OnboardingProgress';
import ActionView from '../../UI/ActionView';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { strings } from '../../../../locales/i18n';
import { connect } from 'react-redux';
import { seedphraseBackedUp } from '../../../actions/user';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getOnboardingNavbarOptions } from '../../UI/Navbar';
import { shuffle, compareMnemonics } from '../../../util/mnemonic';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import { ManualBackUpStepsSelectorsIDs } from '../../../../e2e/selectors/Onboarding/ManualBackUpSteps.selectors';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Routes from '../../../constants/navigation/Routes';

const ManualBackupStep2 = ({ navigation, seedphraseBackedUp, route }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [confirmedWords, setConfirmedWords] = useState([]);
  const [wordsDict, setWordsDict] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seedPhraseReady, setSeedPhraseReady] = useState(false);
  const [showStatusBottomSheet, setShowStatusBottomSheet] = useState(false);

  const currentStep = 2;
  const words =
    process.env.JEST_WORKER_ID === undefined
      ? shuffle(route.params?.words)
      : route.params?.words;

  const createWordsDictionary = () => {
    const dict = {};
    words.forEach((word, i) => {
      dict[`${word},${i}`] = { currentPosition: undefined };
    });
    setWordsDict(dict);
  };

  const updateNavBar = useCallback(() => {
    navigation.setOptions(getOnboardingNavbarOptions(route, {}, colors));
  }, [colors, navigation, route]);

  useEffect(() => {
    const wordsFromRoute = route.params?.words ?? [];
    setConfirmedWords(
      new Array(wordsFromRoute.length).fill({
        word: undefined,
        originalPosition: undefined,
      }),
    );
    createWordsDictionary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  const findNextAvailableIndex = useCallback(
    () => confirmedWords.findIndex(({ word }) => !word),
    [confirmedWords],
  );

  const selectWord = useCallback(
    (word, i) => {
      let tempCurrentIndex = currentIndex;
      const tempWordsDict = wordsDict;
      const tempConfirmedWords = confirmedWords;
      if (wordsDict[`${word},${i}`].currentPosition !== undefined) {
        tempCurrentIndex = wordsDict[`${word},${i}`].currentPosition;
        tempWordsDict[`${word},${i}`].currentPosition = undefined;
        tempConfirmedWords[currentIndex] = {
          word: undefined,
          originalPosition: undefined,
        };
      } else {
        tempWordsDict[`${word},${i}`].currentPosition = currentIndex;
        tempConfirmedWords[currentIndex] = { word, originalPosition: i };
        tempCurrentIndex = findNextAvailableIndex();
      }

      setCurrentIndex(tempCurrentIndex);
      setWordsDict(tempWordsDict);
      setConfirmedWords(tempConfirmedWords);
      setSeedPhraseReady(findNextAvailableIndex() === -1);

      // const confirmedWordFinal = tempConfirmedWords
      //   .map((word) => word.word)
      //   .filter((word) => word !== undefined);
      // if (confirmedWordFinal.length === route.params?.words.length) {
      //   setShowStatusBottomSheet(true);
      // }
    },
    [confirmedWords, currentIndex, findNextAvailableIndex, wordsDict],
  );

  const clearConfirmedWordAt = (i) => {
    const { word, originalPosition } = confirmedWords[i];
    const currentIndex = i;
    if (word && (originalPosition || originalPosition === 0)) {
      wordsDict[[word, originalPosition]].currentPosition = undefined;
      confirmedWords[i] = { word: undefined, originalPosition: undefined };
    }

    setCurrentIndex(currentIndex);
    setWordsDict(wordsDict);
    setConfirmedWords(confirmedWords);
    setSeedPhraseReady(findNextAvailableIndex() === -1);
  };

  const validateWords = useCallback(() => {
    const validWords = route.params?.words ?? [];
    const proposedWords = confirmedWords.map(
      (confirmedWord) => confirmedWord.word,
    );

    return compareMnemonics(validWords, proposedWords);
  }, [confirmedWords, route.params?.words]);

  const goNext = () => {
    if (validateWords()) {
      seedphraseBackedUp();
      InteractionManager.runAfterInteractions(async () => {
        const words = route.params?.words;
        navigation.navigate('OptinMetrics', {
          steps: route.params?.steps,
          words,
          params: {
            showRecoveryHint: true,
          },
          onContinue: () => {
            navigation.navigate('OnboardingSuccess', {
              params: {
                showRecoveryHint: true,
                hello: 'world',
              },
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

  const renderWordBox = (word, i) => {
    const styles = createStyles(colors);

    return (
      <View key={`word_${i}`} style={styles.wordBoxWrapper}>
        <TouchableOpacity
          onPress={() => {
            clearConfirmedWordAt(i);
          }}
          style={[
            styles.inputContainer,
            i === currentIndex && styles.currentWord,
            confirmedWords[i].word && styles.confirmedWord,
          ]}
        >
          <Text style={styles.wordBoxIndex}>{i + 1}.</Text>
          <Text style={styles.word}>{word}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWordSelectableBox = useCallback(
    (key, i) => {
      const [word] = key.split(',');
      const selected = wordsDict[key].currentPosition !== undefined;
      const styles = createStyles(colors);

      return (
        <TouchableOpacity
          // eslint-disable-next-line react/jsx-no-bind
          onPress={() => selectWord(word, i)}
          style={[styles.selectableWord, selected && styles.selectedWord]}
          key={`selectableWord_${i}`}
        >
          <Text
            style={[
              styles.selectableWordText,
              selected && styles.selectedWordText,
            ]}
          >
            {word}
          </Text>
        </TouchableOpacity>
      );
    },
    [colors, selectWord, wordsDict],
  );

  const renderWords = useCallback(
    () => (
      <View style={styles.words}>
        {Object.keys(wordsDict).map((key, i) =>
          renderWordSelectableBox(key, i),
        )}
      </View>
    ),
    [renderWordSelectableBox, styles.words, wordsDict],
  );

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <View style={styles.container}>
        <Text style={styles.step}>Step 3 of 3</Text>
        <ActionView
          confirmTestID={ManualBackUpStepsSelectorsIDs.CONTINUE_BUTTON}
          confirmText={strings('manual_backup_step_2.complete')}
          onConfirmPress={goNext}
          confirmDisabled={!seedPhraseReady || !validateWords()}
          showCancelButton={false}
          confirmButtonMode={'confirm'}
          showConfirmButton={false}
        >
          <View
            style={styles.wrapper}
            testID={ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER}
          >
            <Text style={styles.action}>
              {strings('manual_backup_step_2.action')}
            </Text>
            <View style={styles.infoWrapper}>
              <Text style={styles.info}>
                {strings('manual_backup_step_2.info')}
              </Text>
            </View>
            <View
              style={[
                styles.seedPhraseContainer,
                seedPhraseReady && styles.seedPhraseWrapperError,
                validateWords() && styles.seedPhraseWrapperComplete,
              ]}
            >
              <View style={styles.seedPhraseInnerContainer}>
                <FlatList
                  data={confirmedWords}
                  numColumns={3}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <View style={styles.wordWrapperContainer}>
                      {renderWordBox(item.word, index)}
                    </View>
                  )}
                />
              </View>
            </View>
            {renderWords()}
            <Button
              variant={ButtonVariants.Primary}
              label={strings('manual_backup_step_2.continue')}
              widthType={ButtonWidthTypes.Full}
              style={styles.continueButton}
              onPress={() => {
                setShowStatusBottomSheet(true);
              }}
            />
          </View>
        </ActionView>
      </View>
      {showStatusBottomSheet && (
        <BottomSheet
          onClose={() => setShowStatusBottomSheet(false)}
          shouldNavigateBack={false}
        >
          <View style={styles.statusContainer}>
            <Icon
              name={validateWords() ? IconName.SuccessSolid : IconName.CircleX}
              size={IconSize.Xl}
              color={
                validateWords() ? colors.success.default : colors.error.default
              }
            />
            <Text style={styles.statusTitle}>
              {validateWords()
                ? strings('manual_backup_step_2.success-title')
                : strings('manual_backup_step_2.error-title')}
            </Text>
            <Text style={styles.statusDescription}>
              {validateWords()
                ? strings('manual_backup_step_2.success-description')
                : strings('manual_backup_step_2.error-description')}
            </Text>
            <Button
              variant={ButtonVariants.Primary}
              label={
                validateWords()
                  ? strings('manual_backup_step_2.success-button')
                  : strings('manual_backup_step_2.error-button')
              }
              widthType={ButtonWidthTypes.Full}
              style={styles.statusButton}
              onPress={() => {
                setShowStatusBottomSheet(false);
                validateWords() && goNext();
              }}
            />
          </View>
        </BottomSheet>
      )}
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
