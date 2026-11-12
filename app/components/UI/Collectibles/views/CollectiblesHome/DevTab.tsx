import React from 'react';
import { ScrollView } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';
import { CollectiblesDevTestIds } from '../../Collectibles.testIds';
import { isCollectiblesDevEnabled } from '../../dev/devTools';
import { PACK_PARTNER_DEVNET_FAUCET_URL } from '../../providers/pack-partner/constants';
import { selectPackPartnerInternalAccount } from '../../providers/pack-partner/selectors/account';
import { showSuccessToast } from '../../hooks/toasts';

/** Test-network tools are kept out of the commercial pack list. */
const DevTab = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { bottom } = useSafeAreaInsets();
  const account = useSelector(selectPackPartnerInternalAccount);
  if (!isCollectiblesDevEnabled()) return null;

  const openFaucet = () => {
    if (!isCollectiblesDevEnabled() || !account) return;
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: PACK_PARTNER_DEVNET_FAUCET_URL,
        linkType: EXTERNAL_LINK_TYPE,
        timestamp: Date.now(),
      },
    });
  };

  return (
    <ScrollView
      contentContainerStyle={tw.style('px-4 gap-6', {
        paddingBottom: Math.max(bottom, 16),
      })}
      testID={CollectiblesDevTestIds.CONTAINER}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('collectibles.dev.description')}
      </Text>
      <Box gap={3}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('collectibles.dev.faucet_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('collectibles.dev.faucet_description')}
        </Text>
        {account && (
          <Text
            variant={TextVariant.BodySm}
            selectable
            testID={CollectiblesDevTestIds.ADDRESS}
          >
            {account.address}
          </Text>
        )}
        <Button
          variant={ButtonVariant.Secondary}
          isFullWidth
          isDisabled={!account}
          onPress={() => {
            if (!account || !isCollectiblesDevEnabled()) return;
            Clipboard.setString(account.address);
            showSuccessToast(strings('collectibles.dev.address_copied'));
          }}
          testID={CollectiblesDevTestIds.COPY_ADDRESS}
        >
          {strings('collectibles.dev.copy_address')}
        </Button>
        <Button
          variant={ButtonVariant.Primary}
          isFullWidth
          isDisabled={!account}
          onPress={openFaucet}
          testID={CollectiblesDevTestIds.FAUCET}
        >
          {strings('collectibles.dev.open_faucet')}
        </Button>
      </Box>
      <Button
        variant={ButtonVariant.Secondary}
        isFullWidth
        onPress={() => Engine.context.CollectiblesController.resetOnboarding()}
        testID={CollectiblesDevTestIds.RESET_ONBOARDING}
      >
        {strings('collectibles.dev.reset_onboarding')}
      </Button>
    </ScrollView>
  );
};

export default DevTab;
