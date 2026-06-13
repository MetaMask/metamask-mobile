import React, { memo } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import PredictMarketOutcomeResolved from '../../../components/PredictMarketOutcomeResolved';
import type { PredictOutcome } from '../../../types';

interface PredictResolvedOutcomesToggleProps {
  closedOutcomes: PredictOutcome[];
  isExpanded: boolean;
  onToggle: () => void;
}

const PredictResolvedOutcomesToggle = memo(
  ({
    closedOutcomes,
    isExpanded,
    onToggle,
  }: PredictResolvedOutcomesToggleProps) => {
    const tw = useTailwind();
    const iconName = isExpanded ? IconName.ArrowUp : IconName.ArrowDown;

    return (
      <Pressable
        onPress={onToggle}
        style={({ pressed }) =>
          tw.style(
            'w-full rounded-xl bg-default px-4 py-3 mt-2 mb-4 bg-muted',
            pressed && 'bg-pressed',
          )
        }
        accessibilityRole="button"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={TextColor.TextDefault}
            >
              {strings('predict.resolved_outcomes')}
            </Text>
            <Box twClassName="px-2 py-0.5 rounded bg-muted">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {closedOutcomes.length}
              </Text>
            </Box>
          </Box>
          <Box testID={`icon-${iconName}`}>
            <Icon
              name={iconName}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
            />
          </Box>
        </Box>
        {isExpanded &&
          closedOutcomes.map((outcome) => (
            <PredictMarketOutcomeResolved
              key={outcome.id}
              outcome={outcome}
              noContainer
            />
          ))}
      </Pressable>
    );
  },
);

PredictResolvedOutcomesToggle.displayName = 'PredictResolvedOutcomesToggle';

export default PredictResolvedOutcomesToggle;
