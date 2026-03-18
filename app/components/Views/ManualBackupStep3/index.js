/* eslint-disable react/prop-types */
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, BackHandler, Keyboard } from 'react-native';
import { connect } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import StorageWrapper from '../../../store/storage-wrapper';
import { saveOnboardingEvent as saveEvent } from '../../../actions/onboarding';
import OnboardingProgress from '../../UI/OnboardingProgress';
import { strings } from '../../../../locales/i18n';
import AndroidBackHandler from '../AndroidBackHandler';
import Device from '../../../util/device';
import Confetti from '../../UI/Confetti';
import HintModal from '../../UI/HintModal';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import { SEED_PHRASE_HINTS } from '../../../constants/storage';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useTheme, mockTheme } from '../../../util/theme';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { OnboardingSuccessComponent } from '../OnboardingSuccess';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

const hardwareBackPress = () => ({});
const HARDWARE_BACK_PRESS = 'hardwareBackPress';

export const ManualBackupStep3 = ({
  navigation,
  route,
  saveOnboardingEvent,
}) => {
  const theme = useTheme();
  const colors = theme.colors || mockTheme.colors;

  const steps = route.params?.steps;
  const currentStep = 4;
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');

  const updateNavBar = useCallback(() => {
    navigation.setOptions(getTransparentOnboardingNavbarOptions(colors));
  }, [navigation, colors]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  useEffect(() => {
    const loadHints = async () => {
      const currentSeedphraseHints =
        await StorageWrapper.getItem(SEED_PHRASE_HINTS);
      const parsedHints =
        currentSeedphraseHints && JSON.parse(currentSeedphraseHints);
      const manualBackup = parsedHints?.manualBackup;
      setHintText(manualBackup || '');
    };
    loadHints();

    BackHandler.addEventListener(HARDWARE_BACK_PRESS, hardwareBackPress);
    return () => {
      BackHandler.removeEventListener(HARDWARE_BACK_PRESS, hardwareBackPress);
    };
  }, []);

  const toggleHint = useCallback(() => {
    setShowHint((prev) => !prev);
  }, []);

  const isHintSeedPhrase = useCallback(
    (text) => {
      const seedWords = route.params?.words;
      if (seedWords) {
        const lower = (s) => String(s).toLowerCase();
        return lower(text) === lower(seedWords.join(' '));
      }
      return false;
    },
    [route.params?.words],
  );

  const saveHint = useCallback(async () => {
    if (!hintText) return;
    if (isHintSeedPhrase(hintText)) {
      Alert.alert('Error!', strings('manual_backup_step_3.no_seedphrase'));
      return;
    }
    toggleHint();
    const currentSeedphraseHints =
      await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    const parsedHints = JSON.parse(currentSeedphraseHints);
    await StorageWrapper.setItem(
      SEED_PHRASE_HINTS,
      JSON.stringify({ ...parsedHints, manualBackup: hintText }),
    );
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(
        MetaMetricsEvents.WALLET_SECURITY_RECOVERY_HINT_SAVED,
      ).build(),
      saveOnboardingEvent,
    );
  }, [hintText, isHintSeedPhrase, toggleHint, saveOnboardingEvent]);

  const done = useCallback(() => {
    navigation.reset({ routes: [{ name: 'HomeNav' }] });
  }, [navigation]);

  const handleChangeText = useCallback((text) => {
    setHintText(text);
  }, []);

  return (
    <Box twClassName="flex-1 bg-default mt-4">
      <Confetti />
      {steps ? (
        <Box twClassName="px-5">
          <OnboardingProgress currentStep={currentStep} steps={steps} />
        </Box>
      ) : null}
      <OnboardingSuccessComponent onDone={done} backedUpSRP />
      {Device.isAndroid() && (
        <AndroidBackHandler customBackPress={navigation.pop} />
      )}
      <HintModal
        onConfirm={saveHint}
        onCancel={toggleHint}
        modalVisible={showHint}
        onRequestClose={Keyboard.dismiss}
        value={hintText}
        onChangeText={handleChangeText}
      />
    </Box>
  );
};

const mapDispatchToProps = (dispatch) => ({
  saveOnboardingEvent: (...eventArgs) => dispatch(saveEvent(eventArgs)),
});

export default connect(null, mapDispatchToProps)(ManualBackupStep3);
