import React, { useEffect } from 'react';
import { Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';

import fox from '../../../animations/Solana_Fox.json';
import { baseStyles, colors as importedColors } from '../../../styles/common';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { useMetrics } from '../../../components/hooks/useMetrics';
import createStyles from './SolanaNewFeatureContent.styles';
import StorageWrapper from '../../../store/storage-wrapper';
import { SOLANA_FEATURE_MODAL_SHOWN } from '../../../constants/storage';
import { SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE } from '../../../constants/urls';
import Routes from '../../../constants/navigation/Routes';
import { SolanaNewFeatureSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/SolanaNewFeatureSheet.selectors';
import { MetaMetricsEvents } from '../../../core/Analytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';

const SolanaNewFeatureContent = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate } = useNavigation();

  const { colors } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    const checkModalStatus = async () => {
      const hasSeenModal = await StorageWrapper.getItem(
        SOLANA_FEATURE_MODAL_SHOWN,
      );

      if (hasSeenModal === 'true') {
        navigate(Routes.WALLET.HOME, {
          screen: Routes.WALLET.HOME,
        });
        return null;
      }
    };
    checkModalStatus();
  }, []);

  const handleClose = async () => {
    await StorageWrapper.setItem(SOLANA_FEATURE_MODAL_SHOWN, 'true');

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.FORCE_UPGRADE_REMIND_ME_LATER_CLICKED,
      )
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
        })
        .build(),
    );

    navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.HOME,
    });

    // goBack();
  };

  const importAccountWithSRP = async () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SOLANA_NEW_FEATURE_CONTENT_IMPORT_ACCOUNT_CLICKED,
      )
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
        })
        .build(),
    );

    await StorageWrapper.setItem(SOLANA_FEATURE_MODAL_SHOWN, 'true');
    navigate(Routes.MULTI_SRP.IMPORT);
  };

  const navigateToLearnMoreAboutSolanaAccounts = () => {
    Linking.openURL(SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE);
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE_CLICKED,
      )
        .addProperties({
          location: 'solana_new_feature_content',
          text: 'Learn More',
          url_domain: SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE,
        })
        .build(),
    );
  };

  return (
    <View
      style={[
        baseStyles.flexGrow,
        { backgroundColor: importedColors.gettingStartedPageBackgroundColor },
      ]}
      testID={SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET}
    >
      <ScrollView
        style={baseStyles.flexGrow}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.wrapper}>
          <View style={styles.ctas}>
            <Text
              style={styles.title}
              variant={TextVariant.HeadingLG}
              color={importedColors.gettingStartedTextColor}
            >
              {strings('solana_new_feature_content.title')}
            </Text>

            <Text
              variant={TextVariant.BodyMD}
              color={importedColors.gettingStartedTextColor}
              style={styles.titleDescription}
            >
              {strings('solana_new_feature_content.title_description')}
            </Text>

            <Text
              variant={TextVariant.BodyXS}
              style={styles.learnMoreButton}
              onPress={navigateToLearnMoreAboutSolanaAccounts}
            >
              {strings('solana_new_feature_content.learn_more')}
            </Text>

            <View style={styles.largeFoxWrapper}>
              <LottieView
                style={styles.image}
                autoPlay
                loop
                // @ts-ignore
                source={fox}
                resizeMode="contain"
              />
            </View>

            <View style={styles.createWrapper}>
              <Button
                variant={ButtonVariants.Primary}
                onPress={() => importAccountWithSRP()}
                testID={
                  SolanaNewFeatureSheetSelectorsIDs.SOLANA_IMPORT_ACCOUNT_BUTTON
                }
                label={strings('solana_new_feature_content.import_your_wallet')}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                style={styles.createWalletButton}
              />
              <Button
                variant={ButtonVariants.Secondary}
                onPress={() => handleClose()}
                testID={
                  SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON
                }
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                style={styles.existingWalletButton}
                label={
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    color={importedColors.gettingStartedTextColor}
                  >
                    {strings('solana_new_feature_content.not_now')}
                  </Text>
                }
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default SolanaNewFeatureContent;
