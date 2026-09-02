import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { truncateNumber } from '../../utils';
import EarnNoFeeTag from '../EarnNoFeeTag';
import EarnStrategyInfoRow from '../EarnStrategyInfoRow';
import {
  EarnStrategyCardVariant,
  type EarnStrategyCardProps,
} from './EarnStrategyCard.types';
import { EarnStrategyCardSelectorsIDs } from './EarnStrategyCard.testIds';

export const getRateTagSeverity = (
  experienceType: EarnStrategyCardProps['experience']['type'],
): TagSeverity =>
  experienceType === 'MONEY_ACCOUNT_DEPOSIT'
    ? TagSeverity.Success
    : TagSeverity.Neutral;

const getRateCopy = (
  rate: EarnStrategyCardProps['experience']['rate'],
): string | undefined => {
  if (rate.status !== 'ready') {
    return undefined;
  }

  const base = strings('earn.strategy_selection.up_to');

  if (rate.type === 'APY') {
    return `${base} ${strings('earn_module.rate_apy', { percentage: truncateNumber(rate.percentage) })}`;
  }

  if (rate.type === 'APR') {
    return `${base} ${strings('earn_module.rate_apr', { percentage: truncateNumber(rate.percentage) })}`;
  }
};

const EarnStrategyCard = ({
  variant,
  experience,
  title,
  subtitle,
  infoRows,
  isActive,
  onPress,
  testID = EarnStrategyCardSelectorsIDs.CONTAINER,
}: EarnStrategyCardProps) => {
  const tw = useTailwind();
  const isPrimary = variant === EarnStrategyCardVariant.Primary;
  const rateSeverity = getRateTagSeverity(experience.type);

  const rateCopy = getRateCopy(experience.rate);

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole={'button'}
      accessibilityState={{ selected: isActive }}
      style={({ pressed }) => tw.style(pressed ? 'opacity-70' : '')}
    >
      <Box
        twClassName={`w-full rounded-xl border bg-muted p-3 ${
          isPrimary ? 'min-h-[196px]' : 'min-h-[100px]'
        } ${isActive ? 'border-white' : 'border-muted'}`}
        accessible={false}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="min-w-0"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="min-w-0 flex-1"
          >
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
              twClassName="flex-shrink"
            >
              {title}
            </Text>
            {rateCopy && (
              <Tag
                severity={rateSeverity}
                testID={
                  testID
                    ? `${testID}-${EarnStrategyCardSelectorsIDs.RATE_TAG}`
                    : undefined
                }
              >
                {rateCopy}
              </Tag>
            )}
            {experience.isFeeSubsidized && (
              <EarnNoFeeTag
                testID={
                  testID
                    ? `${testID}-${EarnStrategyCardSelectorsIDs.NO_FEE_TAG}`
                    : undefined
                }
              />
            )}
          </Box>
          {isActive && (
            <Icon
              name={IconName.Check}
              size={IconSize.Lg}
              color={IconColor.IconDefault}
              testID={
                testID
                  ? `${testID}-${EarnStrategyCardSelectorsIDs.ACTIVE_CHECK}`
                  : undefined
              }
            />
          )}
        </Box>

        {isPrimary
          ? infoRows && (
              <Box gap={3} twClassName="mt-4">
                {infoRows.map((infoRow, index) => (
                  <EarnStrategyInfoRow
                    key={infoRow.id}
                    text={infoRow.text}
                    testID={
                      testID
                        ? `${testID}-${EarnStrategyCardSelectorsIDs.INFO_ROW}-${index}`
                        : undefined
                    }
                    startAccessory={
                      <Box
                        twClassName="h-8 w-8 items-center justify-center rounded-full bg-default"
                        accessible={false}
                      >
                        <Icon
                          name={infoRow.icon}
                          size={IconSize.Md}
                          color={IconColor.SuccessDefault}
                        />
                      </Box>
                    }
                  />
                ))}
              </Box>
            )
          : Boolean(subtitle) && (
              <Box twClassName="mt-3">
                {subtitle && (
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                  >
                    {subtitle}
                  </Text>
                )}
              </Box>
            )}
      </Box>
    </Pressable>
  );
};

export default EarnStrategyCard;
