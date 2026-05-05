import React, { useCallback, useMemo } from 'react';
import { Platform, StatusBar } from 'react-native';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { AccountDetailsIds } from '../../AccountDetails.testIds';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  HeaderBase,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ParamListBase,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import SecurityQuizLockImage from '../../../../../images/security-quiz-intro-lock.svg';
import { SRP_GUIDE_URL } from '../../../../../constants/urls';
import { ExportCredentialsIds } from '../../AccountDetails/ExportCredentials.testIds';
import { useKeyringId } from '../../../../hooks/useKeyringId';

interface RootNavigationParamList extends ParamListBase {
  RevealSRP: {
    account: InternalAccount;
  };
}

type RevealSRPProp = RouteProp<RootNavigationParamList, 'RevealSRP'>;

export const RevealSRP = () => {
  const route = useRoute<RevealSRPProp>();
  const { account } = route.params;
  const insets = useSafeAreaInsets();
  const tw = useTailwind();
  const { navigate, goBack } = useNavigation();

  const keyringId = useKeyringId(account);

  const containerStyle = useMemo(
    () =>
      tw.style(
        'flex-1 px-4',
        Platform.OS === 'android' && StatusBar.currentHeight
          ? { paddingTop: StatusBar.currentHeight }
          : undefined,
        {
          paddingBottom: Platform.OS === 'android' ? 10 : insets.bottom,
        },
      ),
    [insets.bottom, tw],
  );

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
    navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      shouldUpdateNav: true,
      keyringId,
    });
  }, [keyringId, navigate]);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={containerStyle}>
      <HeaderBase
        twClassName="flex-row items-center"
        startAccessory={
          <ButtonIcon
            testID={AccountDetailsIds.BACK_BUTTON}
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={handleBackClick}
          />
        }
      >
        {strings('multichain_accounts.reveal_srp.header')}
      </HeaderBase>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        twClassName="mb-auto grow justify-center gap-4"
        testID={ExportCredentialsIds.CONTAINER}
      >
        <Box twClassName="mx-[60px] my-[46px]">
          <SecurityQuizLockImage
            name="security-quiz-lock"
            height={200}
            width={190}
          />
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('multichain_accounts.reveal_srp.description')}
        </Text>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Stretch}
        style={tw.style(
          'mt-auto w-full gap-4',
          Platform.OS === 'android' && 'pb-3',
        )}
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleGetStartedClick}
          testID={ExportCredentialsIds.NEXT_BUTTON}
        >
          {strings('multichain_accounts.reveal_srp.get_started')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleLearnMoreClick}
          testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
        >
          {strings('multichain_accounts.reveal_srp.learn_more')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};
