import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  HeaderStandard,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type Routes from '../../../../constants/navigation/Routes';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import type { CollectiblesStackParamList } from '../types/navigation';

type PackRoute = RouteProp<
  CollectiblesStackParamList,
  typeof Routes.COLLECTIBLES.PACK
>;

/** Placeholder for the pack detail page until GAC-88. */
export function CollectiblesPackScreen() {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation();
  // Later: useLocalSearchParams() with Expo Router.
  const { packCode } = useRoute<PackRoute>().params;

  return (
    <View className="flex-1 bg-default" style={{ paddingTop: top }}>
      <HeaderStandard
        title={strings('collectibles.placeholder.pack')}
        onBack={() => navigation.goBack()}
      />
      <View className="flex-1 items-center justify-center p-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {packCode}
        </Text>
      </View>
    </View>
  );
}
