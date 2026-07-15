import React, { ReactElement, ReactNode } from 'react';
import { Pressable } from 'react-native';
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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  PayWithRowConfig,
  PayWithRowTagRenderer,
} from '../../modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export type PaymentMethodRowProps = PayWithRowConfig;

const renderFirstTag = (
  tagRenderers: PayWithRowTagRenderer[] | undefined,
): ReactNode =>
  tagRenderers?.reduce<ReactNode>((found, render) => found ?? render(), null) ??
  null;

const renderTrailing = (
  trailingElement: PayWithRowConfig['trailingElement'],
): ReactElement | null => {
  if (trailingElement == null) {
    return null;
  }

  switch (trailingElement) {
    case 'checkmark':
      return (
        <Icon
          name={IconName.Check}
          size={IconSize.Md}
          color={IconColor.IconDefault}
          testID="payment-method-row-checkmark"
        />
      );
    case 'chevron':
      return (
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
          testID="payment-method-row-chevron"
        />
      );
    case 'none':
      return null;
    default:
      return trailingElement;
  }
};

const PaymentMethodRow = ({
  id,
  icon,
  title,
  subtitle,
  isSelected,
  tagRenderers,
  trailingElement,
  onPress,
  disabled,
  testID,
}: PaymentMethodRowProps) => {
  const tw = useTailwind();
  const resolvedTestID = testID ?? `payment-method-row-${id}`;
  const rowBackgroundClass = isSelected ? 'bg-section' : 'bg-transparent';
  const iconSlotTestID = `${resolvedTestID}-icon-slot`;
  const tag = renderFirstTag(tagRenderers);

  const content = (
    <>
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName={`w-10 h-10 rounded-full ${
          isSelected ? 'bg-muted' : 'bg-section'
        }`}
        testID={iconSlotTestID}
      >
        {icon}
      </Box>
      <Box twClassName="ml-3 flex-1 min-w-0">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2 flex-wrap"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={`${resolvedTestID}-title`}
          >
            {title}
          </Text>
          {tag}
        </Box>
        {subtitle ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={`${resolvedTestID}-subtitle`}
          >
            {subtitle}
          </Text>
        ) : null}
      </Box>
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="min-w-6"
      >
        {renderTrailing(trailingElement)}
      </Box>
    </>
  );

  if (!onPress) {
    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName={`px-4 py-3 ${rowBackgroundClass} ${
          disabled ? 'opacity-50' : ''
        }`}
        testID={resolvedTestID}
      >
        {content}
      </Box>
    );
  }

  return (
    <Pressable
      testID={resolvedTestID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center px-4 py-3',
          rowBackgroundClass,
          pressed && !disabled ? 'bg-pressed' : '',
          disabled ? 'opacity-50' : '',
        )
      }
    >
      {content}
    </Pressable>
  );
};

export default PaymentMethodRow;
