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
  label: string;
}

export function NavButtons() {
  const navigation =
    useNavigation<NativeStackNavigationProp<CollectiblesStackParamList>>();
  const navButtons: NavButton[] = [
    {
      name: 'packs',
      route: collectiblesRoutes.packs,
      icon: IconName.Gift,
      label: strings('collectibles.landing.packs'),
    },
    {
      name: 'collection',
      route: collectiblesRoutes.collection,
      icon: IconName.Category,
      label: strings('collectibles.landing.collection'),
    },
    {
      name: 'market',
      route: collectiblesRoutes.market,
      icon: IconName.Tag,
      label: strings('collectibles.landing.market'),
    },
  ];

  return (
    <View className="flex-row gap-2 px-4">
      {navButtons.map((button) => (
        <MainActionButton
          key={button.name}
          iconName={button.icon}
          label={button.label}
          onPress={() => navigation.navigate(button.route)}
          twClassName="flex-1"
          testID={collectiblesTestIds.landingNavButton(button.name)}
        />
      ))}
    </View>
  );
}
