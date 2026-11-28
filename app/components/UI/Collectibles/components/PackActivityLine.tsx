import React, { useEffect, useReducer } from 'react';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import type { PackActivity } from '../types/packs';
import { View } from '../../primitives/View';

const rotationMs = 4500;

interface Props {
  activity: PackActivity;
}

export function PackActivityLine({ activity }: Props) {
  const tw = useTailwind();

  const { formatCompact } = useFormatters();

  const [step, nextStep] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const timer = setInterval(nextStep, rotationMs);
    return () => clearInterval(timer);
  }, []);

  const messages = [
    strings('collectibles.pack_detail.opened_by', {
      name: activity.openerName,
      count: formatCompact(activity.otherOpeners),
    }),
    strings(`collectibles.pack_detail.pulled_${activity.pulledRarity}`, {
      name: activity.pullerName,
    }),
  ];
  const message = messages[step % messages.length];

  return (
    <View className="h-6 w-full overflow-hidden">
      <Animated.View
        key={message}
        entering={FadeInDown}
        exiting={FadeOutUp}
        style={tw.style('absolute inset-0 items-center justify-center')}
      >
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
