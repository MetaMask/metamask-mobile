import React from 'react';
import { Image, Linking, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';

import FoxVipers from '../../../images/Fox_Vipers.png';
import { baseStyles, colors as importedColors } from '../../../styles/common';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
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

  const styles = createStyles();

  const handleClose = async () => {
    await StorageWrapper.setItem(SOLANA_FEATURE_MODAL_SHOWN, 'true');

    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_NEW_LINK_CLICKED)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
          feature: 'solana-import-wallet',
          action: 'decline',
        })
        .build(),
    );

    navigate(Routes.WALLET.HOME);
  };

  const importAccountWithSRP = async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WHATS_NEW_LINK_CLICKED)
        .addProperties({
          ...generateDeviceAnalyticsMetaData(),
          feature: 'solana-import-wallet',
          action: 'engage',
        })
        .build(),
    );

    await StorageWrapper.setItem(SOLANA_FEATURE_MODAL_SHOWN, 'true');
    navigate(Routes.MULTI_SRP.IMPORT);
  };

  const navigateToLearnMoreAboutSolanaAccounts = () => {
    Linking.openURL(SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE);
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
          <Text
            style={styles.title}
            variant={TextVariant.HeadingLG}
            color={importedColors.gettingStartedTextColor}
          >
            {strings('solana_new_feature_content.title')}
          </Text>
          <View style={styles.ctas}>
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
              testID={
                SolanaNewFeatureSheetSelectorsIDs.SOLANA_LEARN_MORE_BUTTON
              }
              onPress={navigateToLearnMoreAboutSolanaAccounts}
            >
              {strings('solana_new_feature_content.learn_more')}
            </Text>

            <View style={styles.largeFoxWrapper}>
              <Image source={FoxVipers} style={styles.foxImage} resizeMode="contain" />
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
                style={styles.importWalletButton}
              />
              <Button
                variant={ButtonVariants.Secondary}
                onPress={() => handleClose()}
                testID={SolanaNewFeatureSheetSelectorsIDs.SOLANA_NOT_NOW_BUTTON}
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                style={styles.notNowButton}
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
