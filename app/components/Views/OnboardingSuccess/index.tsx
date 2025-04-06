import React, { useLayoutEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Linking,
  // Keyboard,
  TouchableOpacity,
  Image,
  Text as RNText,
  TextInput,
} from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import { TextColor } from '../../../component-library/components/Texts/Text/Text.types';
import { useNavigation, useRoute } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
// import HintModal from '../../UI/HintModal';
import { useTheme } from '../../../util/theme';
import StorageWrapper from '../../../store/storage-wrapper';
import { SEED_PHRASE_HINTS } from '../../../constants/storage';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import AppConstants from '../../../core/AppConstants';
import Emoji from 'react-native-emoji';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import styles from './index.styles';
const wallet_ready_image = require('../../../images/wallet-ready.png'); // eslint-disable-line

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
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const params = useRoute()?.params as {
    params: {
      showRecoveryHint?: boolean;
      hello?: string;
    };
  };

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

  // const toggleHint = () => {
  //   setShowHint((hintVisible) => !hintVisible);
  // };

  // const renderHint = () => (
  //   <HintModal
  //     onConfirm={saveHint}
  //     onCancel={toggleHint}
  //     modalVisible={showHint}
  //     onRequestClose={Keyboard.dismiss}
  //     value={hintText}
  //     onChangeText={setHintText}
  //   />
  // );

  const renderContent = () => {
    if (backedUpSRP && !params?.params?.showRecoveryHint) {
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
    } else if (noSRP && !params?.params?.showRecoveryHint) {
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
        {/* <RNText style={styles.emoji}>🎉</RNText> */}
        <Text style={styles.title}>
          {strings('onboarding_success.import_title')}
        </Text>
        <Image
          source={wallet_ready_image}
          resizeMethod={'auto'}
          style={styles.walletReadyImage}
        />
        <View style={styles.descriptionWrapper}>
          <Text style={styles.description}>
            {strings('onboarding_success.import_description')}
          </Text>

          <Text style={styles.description}>
            <Text color={TextColor.Link} onPress={handleLink}>
              {strings('onboarding_success.learn_how')}{' '}
            </Text>
            {strings('onboarding_success.import_description2')}
          </Text>
        </View>
      </>
    );
  };

  const renderFooter = () => (
    <View style={styles.footerWrapper}>
      {params?.params?.showRecoveryHint && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.linkWrapper]}
            onPress={() => setShowHint(true)}
          >
            <View style={styles.row}>
              <View style={styles.iconWrapper}>
                <Icon
                  name={IconName.AddSquare}
                  size={IconSize.Sm}
                  color={IconColor.Default}
                />
              </View>
              <Text color={TextColor.Default}>
                {strings('onboarding_success.create_hint')}
              </Text>
            </View>
            <View style={styles.iconWrapper}>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.Default}
              />
            </View>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.linkWrapper]}
          onPress={goToDefaultSettings}
        >
          <View style={styles.row}>
            <View style={styles.iconWrapper}>
              <Icon
                name={IconName.Setting}
                size={IconSize.Sm}
                color={IconColor.Default}
              />
            </View>
            <Text color={TextColor.Default}>
              {strings('onboarding_success.manage_default_settings')}
            </Text>
          </View>
          <View style={styles.iconWrapper}>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.Default}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.root}
      testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
    >
      {!showHint ? (
        <>
          <View style={styles.contentWrapper}>
            {renderContent()}
            {renderFooter()}
          </View>
          <View style={styles.buttonWrapper}>
            <Button
              testID={OnboardingSuccessSelectorIDs.DONE_BUTTON}
              label={strings('onboarding_success.done')}
              variant={ButtonVariants.Primary}
              onPress={onDone}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              style={styles.doneButton}
            />
          </View>
        </>
      ) : (
        <View style={styles.hintWrapper}>
          <Text style={styles.hintTitle}>
            {strings('onboarding_success.hint_title')}
          </Text>
          <View style={styles.hintDescriptionWrapper}>
            <Text style={styles.description}>
              {strings('onboarding_success.hint_description')}
            </Text>
            <Text style={styles.description}>
              {strings('onboarding_success.hint_description2')}
            </Text>
          </View>
          <TextInput
            style={styles.hintInput}
            placeholder={strings('onboarding_success.hint_placeholder')}
            value={hintText}
            onChangeText={setHintText}
          />
          <Button
            label={strings('onboarding_success.hint_saved')}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={saveHint}
          />
        </View>
      )}
    </ScrollView>
  );
};

export default OnboardingSuccess;
