import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { AnimatedGradientBorder } from '../../../../UI/MarketInsights/components/MarketInsightsEntryCard/AnimatedGradientBorder';
import { strings } from '../../../../../../locales/i18n';

interface OndoWinnerBannerProps {
  campaignName: string;
  onPress?: () => void;
  testID?: string;
}

// 2500ms matches the animation cycle: 1000ms sweep + 1500ms hold/reset.
const LOOP_INTERVAL_MS = 2500;

const OndoWinnerBanner: React.FC<OndoWinnerBannerProps> = ({
  campaignName,
  onPress,
  testID,
}) => {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [borderKey, setBorderKey] = useState(0);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = event.nativeEvent.layout;
      setDimensions((prev) => prev ?? { width, height });
    },
    [],
  );

  useEffect(() => {
    const id = setInterval(() => setBorderKey((k) => k + 1), LOOP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.8 : 1} onPress={onPress}>
      <Box
        twClassName="bg-muted rounded-xl p-4 mt-2 gap-2"
        testID={testID}
        onLayout={handleLayout}
      >
        <AnimatedGradientBorder
          dimensions={dimensions}
          animationKey={borderKey}
        />
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {strings('rewards.ondo_winning_banner.title', { campaignName })}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('rewards.ondo_winning_banner.description')}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};

export default OndoWinnerBanner;
