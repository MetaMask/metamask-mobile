import React from 'react';
import { Pressable } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';

export enum ChecklistItemVariant {
  Default = 'default',
  Card = 'card',
  Minimal = 'minimal',
  Glass = 'glass',
}

interface ChecklistItemProps {
  title: string;
  isCompleted: boolean;
  onPress?: () => void;
  isLoading?: boolean;
  variant?: ChecklistItemVariant;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  title,
  isCompleted,
  onPress,
  isLoading,
  variant = ChecklistItemVariant.Default,
}) => {
  const tw = useTailwind();

  const isCard = variant === ChecklistItemVariant.Card;
  const isMinimal = variant === ChecklistItemVariant.Minimal;
  const isGlass = variant === ChecklistItemVariant.Glass;

  if (isGlass) {
    return (
      <Pressable onPress={onPress} disabled={isCompleted || isLoading}>
        <Box
          twClassName="flex-row items-center p-5 mb-3 rounded-2xl bg-background-default"
          style={tw.style('border border-border-muted shadow-sm', isCompleted && 'opacity-80')}
        >
          <Box twClassName="mr-4">
            {isCompleted ? (
              <Box twClassName="w-10 h-10 rounded-full bg-success-muted items-center justify-center">
                <Icon
                  name={IconName.Check}
                  size={IconSize.Md}
                  color={IconColor.Success}
                />
              </Box>
            ) : (
              <Box twClassName="w-10 h-10 rounded-full border-2 border-border-muted items-center justify-center">
                <Box twClassName="w-2 h-2 rounded-full bg-border-muted" />
              </Box>
            )}
          </Box>
          <Text
            variant={TextVariant.BodyLG}
            color={TextColor.Default}
            style={tw.style('flex-1')}
          >
            {title}
          </Text>
        </Box>
      </Pressable>
    );
  }

  if (isMinimal) {
    return (
      <Pressable onPress={onPress} disabled={isCompleted || isLoading}>
        <Box
          twClassName="flex-row items-center py-3 border-b border-border-muted"
          style={tw.style(isCompleted && 'opacity-50')}
        >
          <Box twClassName="mr-3">
            {isCompleted ? (
              <Icon
                name={IconName.Check}
                size={IconSize.Sm}
                color={IconColor.Success}
              />
            ) : (
              <Box twClassName="w-4 h-4 rounded-full border border-icon-muted" />
            )}
          </Box>
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Default}
            style={tw.style('flex-1')}
          >
            {title}
          </Text>
        </Box>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={isCompleted || isLoading}>
      <Box
        twClassName={isCard ? 'flex-row items-center p-4 mb-2 rounded-lg bg-background-default' : 'flex-row items-center p-4 mb-2 rounded-lg bg-background-alternative'}
        style={tw.style(
          isCard ? 'border border-border-muted shadow-xs' : 'border border-border-default',
          isCompleted && 'opacity-60'
        )}
      >
        <Box twClassName="mr-3">
          {isCompleted ? (
            <Icon
              name={IconName.Check}
              size={IconSize.Md}
              color={IconColor.Success}
            />
          ) : (
            <Box
              twClassName="w-5 h-5 rounded-full border-2 border-icon-muted"
              style={tw.style(isLoading && 'border-primary-default')}
            />
          )}
        </Box>
        <Text
          variant={TextVariant.BodyMD}
          color={isCompleted ? TextColor.Alternative : TextColor.Default}
          style={tw.style('flex-1')}
        >
          {title}
        </Text>
        {!isCompleted && !isLoading && (
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.Muted}
          />
        )}
      </Box>
    </Pressable>
  );
};

export default ChecklistItem;
