import React, { memo } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import type { PredictOutcome } from '../types';
import PredictMarketOutcomeResolved from './PredictMarketOutcomeResolved';

export interface PredictResolvedOutcomesSectionProps {
  closedOutcomes: PredictOutcome[];
  isExpanded: boolean;
  onToggle: () => void;
}

const PredictResolvedOutcomesSection = memo(
  ({
    closedOutcomes,
    isExpanded,
    onToggle,
  }: PredictResolvedOutcomesSectionProps) => {
    const tw = useTailwind();
    const { colors } = useTheme();

    if (closedOutcomes.length === 0) {
      return null;
    }

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
          <Icon
            name={isExpanded ? IconName.ArrowUp : IconName.ArrowDown}
            size={IconSize.Md}
            color={colors.text.alternative}
          />
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

PredictResolvedOutcomesSection.displayName = 'PredictResolvedOutcomesSection';

export default PredictResolvedOutcomesSection;
