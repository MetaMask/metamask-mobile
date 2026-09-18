import React, { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { selectKycUserStatus } from '../../../../../selectors/kycController';

export const VbaKycPendingSelectorsIDs = {
  CONTAINER: 'vba-kyc-pending',
  TITLE: 'vba-kyc-pending-title',
  DESCRIPTION: 'vba-kyc-pending-description',
  BACK_TO_HOME_BUTTON: 'vba-kyc-pending-back-to-home-button',
} as const;

const KycPending = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const userStatus = useSelector(selectKycUserStatus);

  // `null` means `GET /kyc/status` has not been read back yet. Treating that as
  // non-pending would close the screen during the tick between the controller
  // refreshing and Redux receiving the new state.
  const hasNonPendingUserStatus =
    userStatus !== null && userStatus !== 'pending';

  const navigateToHome = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  useEffect(() => {
    if (hasNonPendingUserStatus) {
      navigateToHome();
    }
  }, [hasNonPendingUserStatus, navigateToHome]);

  if (hasNonPendingUserStatus) {
    return null;
  }

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VbaKycPendingSelectorsIDs.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        paddingHorizontal={4}
        twClassName="flex-1"
      >
        <AvatarIcon
          iconName={IconName.SecurityTick}
          severity={AvatarIconSeverity.Success}
          size={AvatarIconSize.Xl}
        />
        <Text
          variant={TextVariant.HeadingLg}
          twClassName="mt-6 text-center"
          testID={VbaKycPendingSelectorsIDs.TITLE}
        >
          {strings('virtual_bank_account.kyc_pending.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
          testID={VbaKycPendingSelectorsIDs.DESCRIPTION}
        >
          {strings('virtual_bank_account.kyc_pending.description')}
        </Text>
      </Box>
      <Box padding={4}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={navigateToHome}
          testID={VbaKycPendingSelectorsIDs.BACK_TO_HOME_BUTTON}
        >
          {strings('virtual_bank_account.kyc_pending.back_to_home_button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default KycPending;
