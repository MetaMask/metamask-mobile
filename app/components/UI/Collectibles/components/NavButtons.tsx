import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  IconName,
  MainActionButton,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { View } from '../../primitives/View';
import {
  collectiblesRoutes,
  type CollectiblesStackParamList,
} from '../routeNames';
import { collectiblesTestIds } from '../Collectibles.testIds';

interface NavButton {
  name: string;
  route: keyof CollectiblesStackParamList;
  icon: IconName;
  labelKey: string;
}

const navButtons: NavButton[] = [
  {
    name: 'packs',
    route: collectiblesRoutes.packs,
    icon: IconName.Gift,
    labelKey: 'collectibles.landing.packs',
  },
  {
    name: 'collection',
    route: collectiblesRoutes.collection,
    icon: IconName.Category,
    labelKey: 'collectibles.landing.collection',
  },
  {
    name: 'market',
    route: collectiblesRoutes.market,
    icon: IconName.Tag,
    labelKey: 'collectibles.landing.market',
  },
];

export function NavButtons() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CollectiblesStackParamList>>();

  return (
    <View className="flex-row gap-2 px-4">
      {navButtons.map((button) => (
        <MainActionButton
          key={button.name}
          iconName={button.icon}
          label={strings(button.labelKey)}
          onPress={() => navigation.navigate(button.route)}
          twClassName="flex-1"
          testID={collectiblesTestIds.landingNavButton(button.name)}
        />
      ))}
    </View>
  );
}
