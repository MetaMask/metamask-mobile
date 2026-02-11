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

interface ChecklistItemProps {
  title: string;
  isCompleted: boolean;
  onPress?: () => void;
  isLoading?: boolean;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  title,
  isCompleted,
  onPress,
  isLoading,
}) => {
  const tw = useTailwind();

  return (
    <Pressable onPress={onPress} disabled={isCompleted || isLoading}>
      <Box
        twClassName="flex-row items-center p-4 mb-2 rounded-lg bg-background-alternative"
        style={tw.style('border border-border-default', isCompleted && 'opacity-60')}
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
