import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { Pressable } from '../../primitives/Pressable';
import { Text } from '../../primitives/Text';
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

// Packs, Collection and Market shortcuts under the hero.
export function CollectiblesNavButtons() {
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
        <Pressable
          key={button.name}
          accessibilityRole="button"
          className="flex-1 items-center gap-1 rounded-xl bg-muted p-3"
          pressedClassName="bg-muted-pressed"
          onPress={() => navigation.navigate(button.route)}
          testID={collectiblesTestIds.landingNavButton(button.name)}
        >
          <Icon
            name={button.icon}
            size={IconSize.Md}
            color={IconColor.IconAlternative}
          />
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            {button.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
