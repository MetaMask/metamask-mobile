import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import VbaIllustration, { VbaIllustrationSource } from './VbaIllustration';

export const VbaKycPendingSelectorsIDs = {
  CONTAINER: 'vba-kyc-pending-container',
  ILLUSTRATION: 'vba-kyc-pending-illustration',
  COME_BACK_LATER_BUTTON: 'vba-kyc-pending-come-back-later-button',
} as const;

const VbaKycPending = ({ onLeave }: { onLeave?: () => void }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const handleComeBackLater = useCallback(() => {
    onLeave?.();
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation, onLeave]);

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 py-4')}
        testID={VbaKycPendingSelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center}>
          <Box
            twClassName="mb-[24px]"
            testID={VbaKycPendingSelectorsIDs.ILLUSTRATION}
          >
            <VbaIllustration
              source={VbaIllustrationSource.scanner}
              twClassName="h-[104px] w-[149px]"
            />
          </Box>
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings('virtual_bank_account.kyc_taking_longer.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-[4px] text-center"
          >
            {strings('virtual_bank_account.kyc_taking_longer.description')}
          </Text>
        </Box>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleComeBackLater}
          testID={VbaKycPendingSelectorsIDs.COME_BACK_LATER_BUTTON}
        >
          {strings('virtual_bank_account.kyc_taking_longer.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaKycPending;
