import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

export const VbaDetailsSelectorsIDs = {
  CONTAINER: 'vba-details-container',
  DONE_BUTTON: 'vba-details-done-button',
} as const;

/**
 * Terminal success screen for VBA onboarding. Reached once the Money account is
 * provisioned (`hydrateVbaOnboarding` returns `autorampStatus: 'ready'`). This is
 * currently a stub; account details will be rendered here in a follow-up.
 */
const VbaDetails = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const handleDone = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard includesTopInset />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaDetailsSelectorsIDs.CONTAINER}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
          {strings('virtual_bank_account.vba_details.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('virtual_bank_account.vba_details.description')}
        </Text>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleDone}
          testID={VbaDetailsSelectorsIDs.DONE_BUTTON}
        >
          {strings('virtual_bank_account.vba_details.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaDetails;
