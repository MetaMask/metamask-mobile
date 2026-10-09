import React, { useCallback } from 'react';
import { Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  IconName,
  ListItem,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import vbaPixLogo from './assets/vba-pix-logo.png';

export const VbaDetailsSelectorsIDs = {
  CONTAINER: 'vba-details-container',
  LOGO: 'vba-details-logo',
  COPY_BUTTON: 'vba-details-copy-button',
  DONE_BUTTON: 'vba-details-done-button',
} as const;

/**
 * Sample account details from the proposed Figma frame. This route receives no
 * params, and hydrate does not return a Pix Copia e Cola payload or a Pix key.
 */
const SAMPLE_PIX_DETAILS = [
  {
    id: 'copia-cola',
    label: 'virtual_bank_account.vba_details.copia_cola_label',
    value: '00020126580014br.gov.bcb.pix2557br.gov.bcb.pix0123mock-sample',
  },
  {
    id: 'pix-key',
    label: 'virtual_bank_account.vba_details.pix_key_label',
    value: 'XXXXXXXX-XXXX-XXXX',
  },
] as const;

/**
 * Completed virtual bank account screen. Reached once the Money account is
 * provisioned (`hydrateVbaOnboarding` returns `autorampStatus: 'ready'`).
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

  const handleCopy = useCallback(
    (value: string) => () => {
      Clipboard.setString(value);
    },
    [],
  );

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaDetailsSelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center} twClassName="mt-2 w-full">
          <Image
            source={vbaPixLogo}
            accessibilityIgnoresInvertColors
            accessibilityLabel={strings(
              'virtual_bank_account.vba_details.title',
            )}
            style={tw.style('h-[88px] w-[88px]')}
            testID={VbaDetailsSelectorsIDs.LOGO}
          />
        </Box>
        <Text variant={TextVariant.HeadingLg} twClassName="mt-6 text-center">
          {strings('virtual_bank_account.vba_details.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
        >
          {strings('virtual_bank_account.vba_details.description')}
        </Text>
        <Box twClassName="mt-6 overflow-hidden rounded-3xl bg-muted">
          {SAMPLE_PIX_DETAILS.map((detail) => (
            <ListItem
              key={detail.id}
              title={strings(detail.label)}
              description={detail.value}
              descriptionProps={{ numberOfLines: 1 }}
              endAccessory={
                <ButtonIcon
                  iconName={IconName.Copy}
                  size={ButtonIconSize.Md}
                  onPress={handleCopy(detail.value)}
                  accessibilityLabel={strings(
                    'virtual_bank_account.vba_details.copy_label',
                  )}
                  testID={`${VbaDetailsSelectorsIDs.COPY_BUTTON}-${detail.id}`}
                />
              }
              accessoryGap={2}
            />
          ))}
        </Box>
      </ScrollView>
      <Box twClassName="gap-4 px-4 pb-4">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('virtual_bank_account.vba_details.legal')}
        </Text>
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
