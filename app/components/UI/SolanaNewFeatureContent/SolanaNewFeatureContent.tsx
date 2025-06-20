import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Linking, View } from 'react-native';
import { SolScope } from '@metamask/keyring-api';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  fontStyles,
  baseStyles,
  colors as importedColors,
} from '../../../styles/common';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';

import LottieView from 'lottie-react-native';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import { useTheme } from '../../../util/theme';
import SolanaLogo from '../../../images/solana-logo-transparent.svg';
import { strings } from '../../../../locales/i18n';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  selectHasCreatedSolanaMainnetAccount,
  selectLastSelectedSolanaAccount,
} from '../../../selectors/accountsController';
import createStyles from './SolanaNewFeatureContent.styles';
import StorageWrapper from '../../../store/storage-wrapper';
import { SOLANA_FEATURE_MODAL_SHOWN } from '../../../constants/storage';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import Engine from '../../../core/Engine';
import {
  CONNECTING_TO_DEPRECATED_NETWORK,
  SOLANA_NEW_FEATURE_CONTENT_LEARN_MORE,
} from '../../../constants/urls';
import Routes from '../../../constants/navigation/Routes';
import { SolanaNewFeatureSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/SolanaNewFeatureSheet.selectors';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import HeaderBase from '../../../component-library/components/HeaderBase';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { MetaMetricsEvents } from '../../../core/Analytics';
import generateDeviceAnalyticsMetaData from '../../../util/metrics';
import fox from '../../../animations/Solana_Fox.json';

const SolanaNewFeatureContent = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate, goBack } = useNavigation();

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const hasExistingSolanaAccount = useSelector(
    selectHasCreatedSolanaMainnetAccount,
  );
  const lastSelectedSolanaAccount = useSelector(
    selectLastSelectedSolanaAccount,
  );

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

  /**
   * Close Button, invokes both modal closing and ref closing
   */
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

  const createSolanaAccount = async () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.FORCE_UPGRADE_REMIND_ME_LATER_CLICKED,
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
      createEventBuilder(MetaMetricsEvents.EXTERNAL_LINK_CLICKED)
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
              {'solana is here!'}
            </Text>

            <Text
              variant={TextVariant.BodyMD}
              color={importedColors.gettingStartedTextColor}
              style={styles.titleDescription}
            >
              {
                'Import your wallet, explore, trade, send it. Native Solana support is now live on MetaMask.'
              }
            </Text>

            <Text
              variant={TextVariant.BodyXS}
              style={styles.learnMoreButton}
              onPress={navigateToLearnMoreAboutSolanaAccounts}
            >
              {'Learn more about Solana accounts'}
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
                onPress={() => createSolanaAccount()}
                testID={
                  SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET
                }
                label={
                  'Import your wallet'
                  // strings('onboarding.start_exploring_now')
                }
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                style={styles.createWalletButton}
              />
              <Button
                variant={ButtonVariants.Secondary}
                onPress={() => handleClose()}
                testID={
                  SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET
                }
                width={ButtonWidthTypes.Full}
                size={ButtonSize.Lg}
                style={styles.existingWalletButton}
                label={
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    color={importedColors.gettingStartedTextColor}
                  >
                    {'Not now'}
                    {/* {strings('onboarding.have_existing_wallet')} */}
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
