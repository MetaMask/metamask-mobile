import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
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
import type { PaymentMethod } from '@metamask/ramps-controller';
import type { PaymentType } from '@consensys/on-ramp-sdk';
import PaymentMethodIcon from '../../UI/Ramp/Aggregator/components/PaymentMethodIcon';
import { formatDelayFromArray } from '../../UI/Ramp/Aggregator/utils';
import { useTheme } from '../../../util/theme';

export const SectionHeader = ({ title }: { title: string }) => (
  <Text
    variant={TextVariant.BodySm}
    color={TextColor.TextAlternative}
    twClassName="uppercase mb-1"
  >
    {title}
  </Text>
);

interface OptionRowProps {
  testID: string;
  label: string;
  description: string;
  onPress: () => void;
  icon: React.ReactNode;
}

export const OptionRow = ({
  testID,
  label,
  description,
  onPress,
  icon,
}: OptionRowProps) => {
  const tw = useTailwind();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={tw.style('flex-row items-center py-4')}
      testID={testID}
      accessibilityRole="button"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="h-10 w-10 rounded-full bg-muted"
      >
        {icon}
      </Box>
      <Box twClassName="flex-1 ml-3">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {label}
        </Text>
        {description ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-0.5"
          >
            {description}
          </Text>
        ) : null}
      </Box>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Lg}
        color={IconColor.IconAlternative}
      />
    </TouchableOpacity>
  );
};

/**
 * Renders the icon for a unified RampsController payment method, using the
 * shared Aggregator icon component (keyed off the method's `paymentType`).
 */
export const RampsPaymentMethodIcon = ({
  paymentMethod,
}: {
  paymentMethod: PaymentMethod;
}) => {
  const { colors } = useTheme();

  return (
    <PaymentMethodIcon
      paymentMethodType={paymentMethod.paymentType as PaymentType}
      size={20}
      color={colors.icon.alternative}
    />
  );
};

/**
 * Description copy for a unified payment method — uses the method's processing
 * delay (e.g. "~3 min") when available.
 */
export const getPaymentMethodDescription = (
  paymentMethod: PaymentMethod,
): string =>
  Array.isArray(paymentMethod.delay) && paymentMethod.delay.length >= 2
    ? (formatDelayFromArray(paymentMethod.delay) ?? '')
    : '';
