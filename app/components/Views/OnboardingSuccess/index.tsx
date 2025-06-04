import React, { useCallback, useLayoutEffect, useMemo } from 'react';
import { ScrollView, View, Linking, TouchableOpacity } from 'react-native';
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
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';
import { useDispatch } from 'react-redux';
import Icon, {
  IconName,
  IconColor,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import AppConstants from '../../../core/AppConstants';
import { OnboardingSuccessSelectorIDs } from '../../../../e2e/selectors/Onboarding/OnboardingSuccess.selectors';

import importAdditionalAccounts from '../../../util/importAdditionalAccounts';
import { setCompletedOnboarding } from '../../../actions/onboarding';
import createStyles from './index.styles';
import CelebratingFox from '../../../animations/Celebrating_Fox.json';
import SearchingFox from '../../../animations/Searching_Fox.json';
import LottieView from 'lottie-react-native';

interface OnboardingSuccessProps {
  onDone: () => void;
  backedUpSRP?: boolean;
  noSRP?: boolean;
}

export const OnboardingSuccessComponent: React.FC<OnboardingSuccessProps> = ({
  onDone,
  backedUpSRP,
  noSRP,
}) => {
  const navigation = useNavigation();

  const dispatch = useDispatch();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useLayoutEffect(() => {
    navigation.setOptions(
      getTransparentOnboardingNavbarOptions(colors, undefined, false),
    );
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
      await importAdditionalAccounts();
      await dispatch(setCompletedOnboarding(true));
    };
    onOnboardingSuccess();
    onDone();
  }, [onDone, dispatch]);

  const renderContent = () => {
    if (backedUpSRP) {
      return (
        <>
          <Text variant={TextVariant.DisplayMD}>
            {strings('onboarding_success.title')}
          </Text>
          <LottieView
            style={styles.walletReadyImage}
            autoPlay
            loop
            source={SearchingFox}
            resizeMode="contain"
          />
          <View style={styles.descriptionWrapper}>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('onboarding_success.description')}
              {'\n'}
              {'\n'}
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Info}
                  onPress={handleLink}
                >
                  {strings('onboarding_success.learn_more')}
                </Text>
                {' ' + strings('onboarding_success.description_continued')}
              </Text>
            </Text>
          </View>
        </>
      );
    } else if (noSRP) {
      return (
        <>
          <Text variant={TextVariant.DisplayMD}>
            {strings('onboarding_success.remind_later')}
          </Text>
          <LottieView
            style={styles.walletReadyImage}
            autoPlay
            loop
            source={SearchingFox}
            resizeMode="contain"
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
        <Text variant={TextVariant.DisplayMD} style={styles.textTitle}>
          {strings('onboarding_success.import_title')}
        </Text>

        <LottieView
          style={styles.walletReadyImage}
          autoPlay
          loop
          source={CelebratingFox}
          resizeMode="contain"
        />

        <View style={styles.descriptionWrapper}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings('onboarding_success.import_description')}
          </Text>

          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            <Text
              color={TextColor.Primary}
              onPress={handleLink}
              testID={OnboardingSuccessSelectorIDs.LEARN_MORE_LINK_ID}
            >
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
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.linkWrapper]}
          onPress={goToDefaultSettings}
          testID={OnboardingSuccessSelectorIDs.MANAGE_DEFAULT_SETTINGS_BUTTON}
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
    </ScrollView>
  );
};

const OnboardingSuccess = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params ?? {
    backedUpSRP: false,
    noSRP: false,
  };

  const { backedUpSRP, noSRP } = params as {
    backedUpSRP: boolean;
    noSRP: boolean;
  };

  return (
    <OnboardingSuccessComponent
      backedUpSRP={backedUpSRP}
      noSRP={noSRP}
      onDone={() => navigation.reset({ routes: [{ name: 'HomeNav' }] })}
    />
  );
};

export default OnboardingSuccess;
