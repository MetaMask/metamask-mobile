import React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import { FireIcon, KeypadIcon, SnowflakeIcon } from './PillIcons';

interface PillSlotProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
  isLoading?: boolean;
}

const Pill = ({
  icon,
  label,
  onPress,
  isDisabled,
  isLoading,
}: PillSlotProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      onPress={isDisabled || isLoading ? undefined : onPress}
      disabled={isDisabled || isLoading}
      style={({ pressed }) =>
        tw.style(
          'flex-1 bg-background-muted rounded-xl py-3 px-2 items-center justify-center gap-1',
          pressed && !isDisabled && !isLoading && 'bg-pressed',
          isDisabled && 'opacity-50',
        )
      }
    >
      <Box twClassName="h-6 w-6 items-center justify-center">
        {isLoading ? <ActivityIndicator size="small" /> : icon}
      </Box>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export interface CardActionPillsProps {
  isLoading: boolean;
  showFund: boolean;
  isFundDisabled: boolean;
  onFund: () => void;
  showDetails: boolean;
  isDetailsLoading: boolean;
  isDetailsShown: boolean;
  onDetails: () => void;
  showPin: boolean;
  isPinLoading: boolean;
  onPin: () => void;
  showFreeze: boolean;
  isFrozen: boolean;
  isFreezeLoading: boolean;
  onToggleFreeze: () => void;
}

const CardActionPills = ({
  isLoading,
  showFund,
  isFundDisabled,
  onFund,
  showDetails,
  isDetailsLoading,
  isDetailsShown,
  onDetails,
  showPin,
  isPinLoading,
  onPin,
  showFreeze,
  isFrozen,
  isFreezeLoading,
  onToggleFreeze,
}: CardActionPillsProps) => {
  const tw = useTailwind();
  const theme = useTheme();
  const iconColor = theme.colors.text.default;

  if (isLoading) {
    return (
      <Box twClassName="flex-row gap-2 mx-4 mt-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            height={64}
            width={'24%'}
            style={tw.style('rounded-xl flex-1')}
          />
        ))}
      </Box>
    );
  }

  const anyVisible = showFund || showDetails || showPin || showFreeze;
  if (!anyVisible) return null;

  return (
    <Box
      twClassName="flex-row gap-2 mx-4 mt-4"
      alignItems={BoxAlignItems.Stretch}
    >
      {showFund && (
        <Pill
          icon={
            <Icon
              name={IconName.Add}
              size={IconSize.Md}
              color={IconColor.Default}
            />
          }
          label={strings('card.card_home.action_pills.fund')}
          onPress={onFund}
          isDisabled={isFundDisabled}
        />
      )}
      {showDetails && (
        <Pill
          icon={
            <Icon
              name={IconName.Card}
              size={IconSize.Md}
              color={IconColor.Default}
            />
          }
          label={strings(
            isDetailsShown
              ? 'card.card_home.action_pills.hide'
              : 'card.card_home.action_pills.details',
          )}
          onPress={onDetails}
          isLoading={isDetailsLoading}
        />
      )}
      {showPin && (
        <Pill
          icon={<KeypadIcon size={24} color={iconColor} />}
          label={strings('card.card_home.action_pills.pin')}
          onPress={onPin}
          isLoading={isPinLoading}
        />
      )}
      {showFreeze && (
        <Pill
          icon={
            isFrozen ? (
              <FireIcon size={24} color={iconColor} />
            ) : (
              <SnowflakeIcon size={24} color={iconColor} />
            )
          }
          label={strings(
            isFrozen
              ? 'card.card_home.action_pills.unfreeze'
              : 'card.card_home.action_pills.freeze',
          )}
          onPress={onToggleFreeze}
          isLoading={isFreezeLoading}
        />
      )}
    </Box>
  );
};

export default CardActionPills;
