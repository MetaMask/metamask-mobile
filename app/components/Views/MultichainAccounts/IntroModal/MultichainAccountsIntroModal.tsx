import React, { useCallback } from 'react';
import { ScrollView, View, StatusBar } from 'react-native';
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

const MultichainAccountsIntroModal = () => {
  const { styles } = useStyles(styleSheet, { theme: useTheme() });
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const handleClose = useCallback(() => {
    dispatch(setMultichainAccountsIntroModalSeen(true));
    navigation.goBack();
  }, [navigation, dispatch]);

  const handleViewAccounts = useCallback(() => {
    dispatch(setMultichainAccountsIntroModalSeen(true));
    navigation.goBack();
    navigation.navigate(...createAccountSelectorNavDetails({}));
  }, [navigation, dispatch]);

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
            label={strings('multichain_accounts.intro.view_accounts_button')}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleViewAccounts}
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
