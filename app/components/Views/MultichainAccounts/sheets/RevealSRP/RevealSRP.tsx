import React, { useCallback } from 'react';
import { Box } from '../../../../UI/Box/Box';
import { SafeAreaView, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { AccountDetailsIds } from '../../../../../../e2e/selectors/MultichainAccounts/AccountDetails.selectors';
import { AlignItems, FlexDirection } from '../../../../UI/Box/box.types';
import ButtonPrimary from '../../../../../component-library/components/Buttons/Button/variants/ButtonPrimary';
import ButtonSecondary from '../../../../../component-library/components/Buttons/Button/variants/ButtonSecondary';
import { useNavigation } from '@react-navigation/native';
import HeaderBase from '../../../../../component-library/components/HeaderBase';
import ButtonLink from '../../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import styleSheet from './RevealSRP.styles';
import { useKeyringId } from '../../../../hooks/useKeyringId';
import SecurityQuizLockImage from '../../../../../images/security-quiz-intro-lock.svg';
import { ButtonSize } from '../../../../../component-library/components/Buttons/Button';
import { SRP_GUIDE_URL } from '../../../../../constants/urls';
import { ExportCredentialsIds } from '../../../../../../e2e/selectors/MultichainAccounts/ExportCredentials.selectors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../util/navigation';

type RevealSRPProp = StackScreenProps<RootParamList, 'RevealSRPCredential'>;

export const RevealSRP = ({ route }: RevealSRPProp) => {
  const { account } = route.params;
  const insets = useSafeAreaInsets();
  const { styles } = useStyles(styleSheet, { insets });
  const { navigate, goBack } = useNavigation();

  const keyringId = useKeyringId(account);

  const handleLearnMoreClick = useCallback(() => {
    navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SRP_GUIDE_URL,
      },
    });
  }, [navigate]);

  const handleBackClick = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleGetStartedClick = useCallback(() => {
    navigate(Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SRP_REVEAL_QUIZ, {
      keyringId,
    });
  }, [keyringId, navigate]);

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBase
        style={styles.headerContainer}
        startAccessory={
          <ButtonLink
            testID={AccountDetailsIds.BACK_BUTTON}
            labelTextVariant={TextVariant.HeadingMD}
            label={<Icon name={IconName.ArrowLeft} size={IconSize.Md} />}
            onPress={handleBackClick}
          />
        }
      >
        {strings('multichain_accounts.reveal_srp.header')}
      </HeaderBase>
      <View
        style={styles.contentContainer}
        testID={ExportCredentialsIds.CONTAINER}
      >
        <SecurityQuizLockImage
          name="security-quiz-lock"
          style={styles.securityQuizLockImage}
          height={200}
          width={190}
        />
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('multichain_accounts.reveal_srp.description')}
        </Text>
      </View>
      <Box
        style={styles.buttonContainer}
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
      >
        <ButtonPrimary
          style={styles.button}
          size={ButtonSize.Lg}
          label={strings('multichain_accounts.reveal_srp.get_started')}
          onPress={handleGetStartedClick}
          testID={ExportCredentialsIds.NEXT_BUTTON}
        />
        <ButtonSecondary
          style={styles.button}
          label={strings('multichain_accounts.reveal_srp.learn_more')}
          onPress={handleLearnMoreClick}
          testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
        />
      </Box>
    </SafeAreaView>
  );
};
