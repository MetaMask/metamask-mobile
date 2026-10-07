import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
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
 * "View your VBA" page shown once the Money account is provisioned
 * (`hydrateVbaOnboarding` returns `autorampStatus: 'ready'`).
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
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 px-4"
        testID={VbaDetailsSelectorsIDs.CONTAINER}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {strings('virtual_bank_account.vba_details.title')}
        </Text>
      </Box>
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
