import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import type Routes from '../../../../constants/navigation/Routes';
import type { CollectiblesStackParamList } from '../types/navigation';

type PackRoute = RouteProp<
  CollectiblesStackParamList,
  typeof Routes.COLLECTIBLES.PACK
>;

/** Placeholder for the pack detail page until GAC-88. */
function CollectiblesPackScreen() {
  const tw = useTailwind();
  const navigation = useNavigation();
  // Later: useLocalSearchParams() with Expo Router.
  const { packCode } = useRoute<PackRoute>().params;

  return (
    <SafeAreaView edges={['top']} style={tw.style('flex-1 bg-default')}>
      <HeaderStandard
        title={strings('collectibles.placeholder.pack')}
        onBack={() => navigation.goBack()}
      />
      <View style={tw.style('flex-1 items-center justify-center p-4')}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {packCode}
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default CollectiblesPackScreen;
