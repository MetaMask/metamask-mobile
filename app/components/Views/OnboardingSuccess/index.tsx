import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import {
  ScrollView,
  View,
  Linking,
  TouchableOpacity,
  Image,
} from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Text from '../../../component-library/components/Texts/Text';
import {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text/Text.types';
import { useNavigation, useRoute } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import {
  getOnboardingNavbarOptions,
  getTransparentOnboardingNavbarOptions,
} from '../../UI/Navbar';
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
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';
import { ToastContext } from '../../../component-library/components/Toast/Toast.context';
import { ToastVariants } from '../../../component-library/components/Toast/Toast.types';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';

const wallet_ready_image = require('../../../images/wallet-ready.png'); // eslint-disable-line
import importAdditionalAccounts from '../../../util/importAdditionalAccounts';
import { setCompletedOnboarding } from '../../../actions/onboarding';
import createStyles from './index.styles';

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
  const route = useRoute();
  const { toastRef } = useContext(ToastContext);

  const dispatch = useDispatch();
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState('');
  const [savedHint, setSavedHint] = useState('');

  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const { showPasswordHint } = (useRoute()?.params as {
    showPasswordHint?: boolean;
  }) || { showPasswordHint: false };

  const headerLeft = useCallback(
    () => (
      <TouchableOpacity onPress={() => setShowHint(false)}>
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Lg}
          color={colors.text.default}
          style={styles.headerLeft}
        />
      </TouchableOpacity>
    ),
    [colors, styles.headerLeft, setShowHint],
  );

  const headerRight = useCallback(() => <View />, []);

  useLayoutEffect(() => {
    navigation.setOptions(
      showHint
        ? getOnboardingNavbarOptions(
            route,
            {
              headerLeft,
              headerRight,
            },
            colors,
            false,
          )
        : getTransparentOnboardingNavbarOptions(colors, false),
    );
  }, [
    navigation,
    colors,
    route,
    showHint,
    styles.headerLeft,
    headerLeft,
    headerRight,
  ]);

  const goToDefaultSettings = () => {
    navigation.navigate(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
    });
  };

  const handleLink = () => {
    Linking.openURL(AppConstants.URLS.WHAT_IS_SRP);
  };

  const fetchHintFromStorage = async () => {
    const hints = await StorageWrapper.getItem(SEED_PHRASE_HINTS);
    if (hints) {
      const parsedHints = JSON.parse(hints);
      setSavedHint(parsedHints?.manualBackup);
    } else {
      setSavedHint('');
    }
  };

  const handleOnDone = useCallback(() => {
    const onOnboardingSuccess = async () => {
      await importAdditionalAccounts();
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
    } else {
      await StorageWrapper.setItem(
        SEED_PHRASE_HINTS,
        JSON.stringify({ manualBackup: hintText }),
      );
    }
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings('onboarding_success.hint_saved_toast'),
          isBold: true,
        },
      ],
      hasNoTimeout: false,
    });
    fetchHintFromStorage();
  };

  useEffect(() => {
    fetchHintFromStorage();
  }, [showHint]);

  const renderContent = () => {
    if (backedUpSRP && !showPasswordHint) {
      return (
        <>
          <Text variant={TextVariant.DisplayMD}>
            {strings('onboarding_success.title')}
          </Text>
          <Image
            source={wallet_ready_image}
            resizeMethod={'auto'}
            style={styles.walletReadyImage}
          />
          <View style={styles.descriptionWrapper}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('onboarding_success.description')}
              <Text variant={TextVariant.BodyMDMedium}>
                {strings('onboarding_success.description_bold')}
                {'\n'}
                {'\n'}
              </Text>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Info}
                onPress={() => setShowHint(true)}
              >
                {strings('onboarding_success.leave_hint')}
                {'\n'}
                {'\n'}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('onboarding_success.description_continued')}
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Info}
                  onPress={handleLink}
                >
                  {' '}
                  {strings('onboarding_success.learn_more')}
                </Text>
              </Text>
            </Text>
          </View>
        </>
      );
    } else if (noSRP && !showPasswordHint) {
      return (
        <>
          <Text variant={TextVariant.DisplayMD}>
            {strings('onboarding_success.remind_later')}
          </Text>
          <Image
            source={wallet_ready_image}
            resizeMethod={'auto'}
            style={styles.walletReadyImage}
          />
          <View style={styles.descriptionWrapper}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('onboarding_success.remind_later_description')}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('onboarding_success.remind_later_description2')}
              <Text variant={TextVariant.BodyMDMedium} onPress={handleLink}>
                {' ' + strings('onboarding_success.setting_security_privacy')}
              </Text>
            </Text>
          </View>
        </>
      );
    }
    return (
      <>
        <Text variant={TextVariant.DisplayMD}>
          {strings('onboarding_success.import_title')}
        </Text>
        <Image
          source={wallet_ready_image}
          resizeMethod={'auto'}
          style={styles.walletReadyImage}
        />
        <View style={styles.descriptionWrapper}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('onboarding_success.import_description')}
          </Text>

          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            <Text color={TextColor.Primary} onPress={handleLink}>
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
      {showPasswordHint && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.linkWrapper]}
            onPress={() => setShowHint(true)}
          >
            <View style={styles.row}>
              <Icon
                name={IconName.AddSquare}
                size={IconSize.Lg}
                color={IconColor.Default}
              />
              <View style={styles.hintTextWrapper}>
                <Text
                  color={TextColor.Default}
                  variant={TextVariant.BodyMDMedium}
                >
                  {strings('onboarding_success.create_hint')}
                </Text>
                {savedHint && (
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Alternative}
                  >
                    {savedHint}
                  </Text>
                )}
              </View>
            </View>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Lg}
              color={IconColor.Alternative}
            />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.linkWrapper]}
          onPress={goToDefaultSettings}
        >
          <View style={styles.row}>
            <Icon
              name={IconName.Setting}
              size={IconSize.Lg}
              color={IconColor.Default}
            />
            <Text color={TextColor.Default} variant={TextVariant.BodyMDMedium}>
              {strings('onboarding_success.manage_default_settings')}
            </Text>
          </View>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Lg}
            color={IconColor.Alternative}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.root]}
      testID={OnboardingSuccessSelectorIDs.CONTAINER_ID}
    >
      {!showHint ? (
        <View style={styles.contentContainer}>
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
        </View>
      ) : (
        <View style={styles.hintWrapper}>
          <View style={styles.hintContent}>
            <Text variant={TextVariant.DisplayMD} color={TextColor.Default}>
              {strings('onboarding_success.hint_title')}
            </Text>
            <View style={styles.hintDescriptionWrapper}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('onboarding_success.hint_description')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('onboarding_success.hint_description2')}
              </Text>
            </View>
            <TextField
              style={styles.hintInput}
              placeholder={strings('onboarding_success.hint_placeholder')}
              value={hintText}
              onChangeText={setHintText}
              size={TextFieldSize.Lg}
              placeholderTextColor={colors.text.muted}
              autoFocus
              keyboardAppearance={themeAppearance}
            />
          </View>
          <Button
            label={strings('onboarding_success.hint_saved')}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={saveHint}
            isDisabled={!hintText}
          />
        </View>
      )}
    </ScrollView>
  );
};

export default OnboardingSuccess;
