import React, { useCallback, useState, useEffect } from 'react';
import { ScrollView, View, StatusBar, ActivityIndicator } from 'react-native';
import {
  Text,
  ButtonIcon,
  TextVariant,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { createAccountSelectorNavDetails } from '../../AccountSelector';
import { strings } from '../../../../../locales/i18n';
import { setMultichainAccountsIntroModalSeen } from '../../../../actions/user';
import { useStyles } from '../../../../component-library/hooks';
import Routes from '../../../../constants/navigation/Routes';
import styleSheet from './MultichainAccountsIntroModal.styles';
import { MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS } from './MultichainAccountsIntroModal.testIds';
import Logger from '../../../../util/Logger';
import Engine from '../../../../core/Engine';

// Minimum timeout duration for wallet alignment process (2 seconds)
const WALLET_ALIGNMENT_MINIMUM_TIMEOUT_MS = 2000;

const MultichainAccountsIntroModal = () => {
  const { styles, theme } = useStyles(styleSheet, { theme: useTheme() });
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isAligning, setIsAligning] = useState(false);
  const [isAlignmentComplete, setIsAlignmentComplete] = useState(false);

  // Start alignment process when modal is displayed
  useEffect(() => {
    const startAlignment = async () => {
      try {
        await Engine.context.MultichainAccountService.alignWallets();
        setIsAlignmentComplete(true);
      } catch (error) {
        Logger.error(
          error as Error,
          'Error aligning wallet in multichain accounts intro modal',
        );
        // Still mark as complete to allow user to proceed
        setIsAlignmentComplete(true);
      }
    };

    startAlignment();
  }, []);

  // Custom label component that shows both text and loading spinner
  const renderButtonLabel = () => {
    if (isAligning) {
      return (
        <View style={styles.loadingButtonLabel}>
          <ActivityIndicator
            size="small"
            color={theme.colors.info.inverse}
            style={styles.loadingSpinner}
          />
          <Text variant={TextVariant.BodyMd} color={TextColor.InfoInverse}>
            {strings('multichain_accounts.intro.setting_up_accounts')}
          </Text>
        </View>
      );
    }
    return strings('multichain_accounts.intro.view_accounts_button');
  };

  const handleClose = useCallback(() => {
    dispatch(setMultichainAccountsIntroModalSeen(true));
    navigation.goBack();
  }, [navigation, dispatch]);

  const handleViewAccounts = useCallback(async () => {
    if (isAligning) return;

    setIsAligning(true);

    try {
      // If alignment is already complete, wait for minimum timeout
      if (isAlignmentComplete) {
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), WALLET_ALIGNMENT_MINIMUM_TIMEOUT_MS);
        });
      } else {
        // If alignment is still running, just wait for minimum timeout
        // The background alignment will complete on its own
        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), WALLET_ALIGNMENT_MINIMUM_TIMEOUT_MS);
        });
      }
    } catch (error) {
      Logger.error(error as Error, 'Error in multichain accounts intro modal');
      // Still proceed to accounts even if there's an error
    } finally {
      dispatch(setMultichainAccountsIntroModalSeen(true));
      setIsAligning(false);
      navigation.goBack();
      navigation.navigate(...createAccountSelectorNavDetails({}));
    }
  }, [navigation, dispatch, isAligning, isAlignmentComplete]);

  const handleLearnMore = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.MULTICHAIN_ACCOUNTS_LEARN_MORE,
    });
  }, [navigation]);

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text
            variant={TextVariant.BodyMd}
            style={styles.title}
            testID={MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.TITLE}
          >
            {strings('multichain_accounts.intro.title')}
          </Text>
          <ButtonIcon
            onPress={handleClose}
            iconName={IconName.Close}
            testID={MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.CLOSE_BUTTON}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={styles.imagePlaceholder}
            testID={MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.IMAGE_PLACEHOLDER}
          />

          <View style={styles.section}>
            <Text
              variant={TextVariant.HeadingMd}
              style={styles.sectionTitle}
              testID={MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_1_TITLE}
            >
              {strings('multichain_accounts.intro.section_1_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.sectionDescription}
              testID={
                MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_1_DESCRIPTION
              }
            >
              {strings('multichain_accounts.intro.section_1_description')}
            </Text>

            <Text
              variant={TextVariant.HeadingMd}
              style={styles.sectionTitle}
              testID={MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_2_TITLE}
            >
              {strings('multichain_accounts.intro.section_2_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              style={styles.sectionDescription}
              color={TextColor.TextAlternative}
              testID={
                MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.SECTION_2_DESCRIPTION
              }
            >
              {strings('multichain_accounts.intro.section_2_description')}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Primary}
            label={renderButtonLabel()}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleViewAccounts}
            isDisabled={isAligning}
            testID={
              MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.VIEW_ACCOUNTS_BUTTON
            }
          />
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('multichain_accounts.intro.learn_more_button')}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleLearnMore}
            testID={MULTICHAIN_ACCOUNTS_INTRO_MODAL_TEST_IDS.LEARN_MORE_BUTTON}
          />
        </View>
      </View>
    </View>
  );
};

export default MultichainAccountsIntroModal;
