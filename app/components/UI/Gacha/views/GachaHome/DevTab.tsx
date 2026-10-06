import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { GachaDevTestIds } from '../../Gacha.testIds';
import PackCard from '../../components/PackCard';
import { getGachaPackArtwork } from '../../controllers/GachaPackCatalog';
import {
  createDemoPack,
  DEMO_ARTWORK_CODE,
  isGachaDevEnabled,
} from '../../dev/revealDemo';

/** Local tools are kept out of the commercial pack list. */
const DevTab = ({ isBusy }: { isBusy: boolean }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  if (!isGachaDevEnabled()) return null;
  const pack = createDemoPack([]);

  return (
    <ScrollView
      contentContainerStyle={tw.style('px-4 pb-8 gap-6')}
      testID={GachaDevTestIds.CONTAINER}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('gacha.dev.description')}
      </Text>
      <Box twClassName="w-1/2 max-w-56 self-center">
        <PackCard
          pack={pack}
          artwork={{
            ...getGachaPackArtwork('collector-crypt', DEMO_ARTWORK_CODE),
            name: pack.name,
          }}
          isDisabled={isBusy}
          onOpen={() =>
            navigation.navigate(Routes.GACHA.REVEAL, { demo: true })
          }
        />
      </Box>
      <Button
        variant={ButtonVariant.Secondary}
        isFullWidth
        isDisabled={isBusy}
        onPress={() => Engine.context.GachaController.resetOnboarding()}
        testID={GachaDevTestIds.RESET_ONBOARDING}
      >
        {strings('gacha.dev.reset_onboarding')}
      </Button>
    </ScrollView>
  );
};

export default DevTab;
