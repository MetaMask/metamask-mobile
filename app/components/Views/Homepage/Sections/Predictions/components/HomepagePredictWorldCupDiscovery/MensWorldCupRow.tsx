import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import HomepagePredictDiscoveryMaterialGlyph from './HomepagePredictDiscoveryMaterialGlyph';

interface MensWorldCupRowProps {
  onPress: () => void;
  eventCountLabel: string;
}

const MensWorldCupRow = ({
  onPress,
  eventCountLabel,
}: MensWorldCupRowProps) => {
  const tw = useTailwind();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={tw.style(
        'w-full flex-row items-center self-stretch py-2 active:opacity-80',
      )}
      testID="homepage-predict-discovery-mens-wc-row"
    >
      <Box twClassName="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <HomepagePredictDiscoveryMaterialGlyph name="sportsSoccer" />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="min-w-0 flex-1 pl-4"
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {strings('predict.homepage_discovery.fifa_world_cup_2026_title')}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {eventCountLabel}
        </Text>
      </Box>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Pressable>
  );
};

export default MensWorldCupRow;
