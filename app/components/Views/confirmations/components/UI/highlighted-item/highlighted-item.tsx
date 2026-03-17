import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import {
  AvatarToken,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { HighlightedItem as HighlightedItemType } from '../../../types/token';

interface HighlightedItemProps {
  item: HighlightedItemType;
}

export function HighlightedItem({ item }: HighlightedItemProps) {
  const tw = useTailwind();
  const iconName = Object.values(IconName).includes(item.icon as IconName)
    ? (item.icon as IconName)
    : undefined;
  const hasActionButtons = (item.actions?.length ?? 0) > 0;

  const handlePress = useCallback(() => {
    item.action();
  }, [item]);

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center justify-between py-2 px-4',
          pressed || item.isSelected ? 'bg-pressed' : 'bg-transparent',
        )
      }
      onPress={handlePress}
    >
      <Box twClassName="flex-row items-center flex-1 min-w-0">
        {iconName ? (
          <Box
            style={tw.style(
              'w-10 h-10 rounded-full bg-background-section items-center justify-center',
            )}
            testID="icon"
          >
            <Icon
              name={iconName}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
            />
          </Box>
        ) : (
          <AvatarToken
            name={item.name}
            src={item.icon ? { uri: item.icon } : undefined}
            style={tw.style('w-10 h-10')}
          />
        )}

        <Box twClassName="ml-4 flex-1 min-w-0">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {item.name_description}
          </Text>
        </Box>
      </Box>

      {hasActionButtons || item.isLoading ? (
        <Box twClassName="flex-row items-center">
          {item.isLoading && <Spinner />}
          {!item.isLoading &&
            item.actions?.map((actionItem, index) => (
              <Box
                key={`${item.name}-${actionItem.buttonLabel}-${index}`}
                twClassName={index > 0 ? 'ml-2' : ''}
              >
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  onPress={actionItem.onPress}
                  isDisabled={actionItem.isDisabled}
                >
                  {actionItem.buttonLabel}
                </Button>
              </Box>
            ))}
        </Box>
      ) : (
        <Box twClassName="h-12 justify-center items-end shrink-0">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
          >
            {item.fiat}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {item.fiat_description}
          </Text>
        </Box>
      )}
    </Pressable>
  );
}
