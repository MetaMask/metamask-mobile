import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  ButtonBase,
  Tag,
  TagSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import EarnNoFeeTag from '../EarnNoFeeTag';
import {
  EarnStrategyRiskLevel,
  type EarnStrategyCardProps,
} from './EarnStrategyCard.types';

const strategyRiskTagConfig: Record<
  EarnStrategyRiskLevel,
  { severity: TagSeverity; labelKey: string }
> = {
  [EarnStrategyRiskLevel.Recommended]: {
    severity: TagSeverity.Success,
    labelKey: 'earn.strategy_selection.tags.recommended',
  },
  [EarnStrategyRiskLevel.Low]: {
    severity: TagSeverity.Success,
    labelKey: 'earn.strategy_selection.tags.low_risk',
  },
  [EarnStrategyRiskLevel.Medium]: {
    severity: TagSeverity.Warning,
    labelKey: 'earn.strategy_selection.tags.medium_risk',
  },
  [EarnStrategyRiskLevel.High]: {
    severity: TagSeverity.Danger,
    labelKey: 'earn.strategy_selection.tags.high_risk',
  },
};

const EarnStrategyCard = ({
  risk,
  title,
  subtitle,
  tertiaryText,
  isFeeSubsidized = false,
  selected = false,
  onPress,
  testID,
}: EarnStrategyCardProps) => {
  const tagConfig = strategyRiskTagConfig[risk];

  return (
    <ButtonBase
      onPress={onPress}
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      twClassName={(pressed) =>
        `h-[170px] flex-1 rounded-2xl border-2 p-4 bg-muted ${
          selected && 'border-2 border-default'
        } ${pressed && 'opacity-70'}`
      }
      contentWrapperProps={{ twClassName: 'h-full w-full' }}
    >
      <Box twClassName="h-full w-full" accessible={false}>
        <Box flexDirection={BoxFlexDirection.Row} gap={2}>
          <Tag severity={tagConfig.severity}>{strings(tagConfig.labelKey)}</Tag>
          {isFeeSubsidized && (
            <EarnNoFeeTag
              testID={testID ? `${testID}-no-fee-tag` : undefined}
            />
          )}
        </Box>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          twClassName="mt-4"
        >
          {title}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          twClassName="mt-1"
        >
          {subtitle}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {tertiaryText}
        </Text>
      </Box>
    </ButtonBase>
  );
};

export default EarnStrategyCard;
