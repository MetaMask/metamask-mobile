import React, { ReactNode, isValidElement } from 'react';
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
import Tag from '../../../../../../component-library/components/Tags/Tag';
import { strings } from '../../../../../../../locales/i18n';
import {
  PayWithRowConfig,
  PayWithRowTrailingVariant,
} from '../../modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export type PaymentMethodRowProps = PayWithRowConfig;

const TRAILING_VARIANTS: readonly PayWithRowTrailingVariant[] = [
  'checkmark',
  'chevron',
  'none',
];

const isTrailingVariant = (
  value: PayWithRowConfig['trailingElement'],
): value is PayWithRowTrailingVariant =>
  typeof value === 'string' &&
  (TRAILING_VARIANTS as readonly string[]).includes(value);

const renderTrailing = (
  trailingElement: PayWithRowConfig['trailingElement'],
): ReactNode => {
  if (trailingElement == null) {
    return null;
  }

  if (isTrailingVariant(trailingElement)) {
    if (trailingElement === 'checkmark') {
      return (
        <Icon
          name={IconName.Check}
          size={IconSize.Md}
          color={IconColor.IconDefault}
          testID="payment-method-row-checkmark"
        />
      );
    }
    if (trailingElement === 'chevron') {
      return (
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
          testID="payment-method-row-chevron"
        />
      );
    }
    return null;
  }

  if (isValidElement(trailingElement)) {
    return trailingElement;
  }

  return null;
};

const PaymentMethodRow = ({
  id,
  icon,
  title,
  subtitle,
  isSelected,
  isLastUsed,
  trailingElement,
  onPress,
  disabled,
  testID,
}: PaymentMethodRowProps) => {
  const tw = useTailwind();
  const resolvedTestID = testID ?? `payment-method-row-${id}`;

  const content = (
    <>
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="w-10 h-10 rounded-full bg-section"
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
          {isLastUsed ? (
            <Tag
              label={strings('confirm.pay_with_bottom_sheet.last_used')}
              testID={`${resolvedTestID}-last-used-tag`}
            />
          ) : null}
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
        twClassName={`px-4 py-3 ${
          isSelected ? 'bg-section' : 'bg-default'
        } ${disabled ? 'opacity-50' : ''}`}
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
          isSelected ? 'bg-section' : 'bg-default',
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
