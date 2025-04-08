import React, { useCallback, useLayoutEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Linking,
  Keyboard,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import Button from '../../../component-library/components/Buttons/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button/Button.types';
import Text from '../../../component-library/components/Texts/Text';
import { TextColor } from '../../../component-library/components/Texts/Text/Text.types';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import HintModal from '../../UI/HintModal';
import { useTheme } from '../../../util/theme';
import StorageWrapper from '../../../store/storage-wrapper';
import { SEED_PHRASE_HINTS } from '../../../constants/storage';
import { useDispatch } from 'react-redux';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import AppConstants from '../../../core/AppConstants';
import Emoji from 'react-native-emoji';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import styles from './index.styles';
import { setCompletedOnboarding } from '../../../actions/onboarding';

interface OnboardingSuccessProps {
  onDone: () => void;
  backedUpSRP?: boolean;
  noSRP?: boolean;
}

const OnboardingSuccess = ({
  onDone,
  backedUpSRP,
  noSRP,
}: OnboardingSuccessProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions(getTransparentOnboardingNavbarOptions(colors));
  }, [navigation, colors]);

  const goToDefaultSettings = () => {
    navigation.navigate(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
    });
  };

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.WHAT_IS_SRP);
  };

  const handleOnDone = useCallback(() => {
    const onOnboardingSuccess = async () => {
      await dispatch(setCompletedOnboarding(true));
    };
    onOnboardingSuccess();
    onDone();
  }, [onDone, dispatch]);

  const saveHint = async () => {
    if (!hintText) return;
    setShowHint(false);
    const currentSeedphraseHints = await StorageWrapper.getItem(
      SEED_PHRASE_HINTS,
    );
    if (currentSeedphraseHints) {
      const parsedHints = JSON.parse(currentSeedphraseHints);
      await StorageWrapper.setItem(
        SEED_PHRASE_HINTS,
        JSON.stringify({ ...parsedHints, manualBackup: hintText }),
      );
    }
  };

  const toggleHint = () => {
    setShowHint((hintVisible) => !hintVisible);
  };

  const renderHint = () => (
    <HintModal
      onConfirm={saveHint}
      onCancel={toggleHint}
      modalVisible={showHint}
      onRequestClose={Keyboard.dismiss}
      value={hintText}
      onChangeText={setHintText}
    />
  );

  const renderContent = () => {
    if (backedUpSRP) {
      return (
        <>
          <Emoji name="tada" style={styles.emoji} />
          <Text style={styles.title}>
            {strings('onboarding_success.title')}
          </Text>
          <View style={styles.descriptionWrapper}>
            <Text style={styles.description}>
              {strings('onboarding_success.description')}
              <Text style={styles.descriptionBold}>
                {strings('onboarding_success.description_bold')}
                {'\n'}
                {'\n'}
              </Text>
              <Text color={TextColor.Info} onPress={() => setShowHint(true)}>
                {strings('onboarding_success.leave_hint')}
                {'\n'}
                {'\n'}
              </Text>
              <Text style={styles.description}>
                {strings('onboarding_success.description_continued')}
                <Text color={TextColor.Info} onPress={handleLink}>
                  {' '}
                  {strings('onboarding_success.learn_more')}
                </Text>
              </Text>
            </Text>
          </View>
        </>
      );
    } else if (noSRP) {
      return (
        <>
          <RNText style={styles.emoji}>🔓</RNText>
          <Text style={styles.title}>
            {strings('onboarding_success.no_srp_title')}
          </Text>
          <View style={styles.descriptionWrapper}>
            <Text style={styles.description}>
              {strings('onboarding_success.no_srp_description')}
              <Text style={styles.descriptionBold}>
                {' '}
                {strings('onboarding_success.description_bold')}
                {'\n'}
                {'\n'}
              </Text>
            </Text>
          </View>
        </>
      );
    }
    return (
      <>
        <RNText style={styles.emoji}>🎉</RNText>
        <Text style={styles.title}>
          {strings('onboarding_success.import_title')}
        </Text>
        <View style={styles.descriptionWrapper}>
          <Text style={styles.description}>
            {strings('onboarding_success.import_description')}
            <Text style={styles.description}>
              <Text color={TextColor.Info} onPress={handleLink}>
                {strings('onboarding_success.learn_how')}{' '}
              </Text>
              {strings('onboarding_success.import_description2')}
            </Text>
          </Text>
        </View>
      </>
    );
  };

  const renderFooter = () => {
    const linkStyle = { paddingTop: backedUpSRP ? 20 : 10 };
    return (
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.linkWrapper, linkStyle]}
          onPress={goToDefaultSettings}
        >
          <View style={styles.iconWrapper}>
            <Icon
              name={IconName.Setting}
              size={IconSize.Sm}
              color={IconColor.Info}
            />
          </View>
          <Text color={TextColor.Info}>
            {strings('onboarding_success.manage_default_settings')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerText}>
          {strings('onboarding_success.default_settings_footer')}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.root}
      testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
    >
      <View style={styles.contentWrapper}>
        {renderContent()}
        {renderFooter()}
      </View>

      <View style={styles.buttonWrapper}>
        <Button
          testID={OnboardingSuccessSelectorIDs.DONE_BUTTON}
          label={strings('onboarding_success.done')}
          variant={ButtonVariants.Primary}
          onPress={handleOnDone}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
      </View>
      {renderHint()}
    </ScrollView>
  );
};

export default OnboardingSuccess;
