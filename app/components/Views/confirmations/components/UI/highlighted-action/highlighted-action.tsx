import React from 'react';
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

import { HighlightedActionListItem } from '../../../types/token';

interface HighlightedActionProps {
  item: HighlightedActionListItem;
}

export function HighlightedAction({ item }: HighlightedActionProps) {
  const tw = useTailwind();
  const iconName = Object.values(IconName).includes(item.icon as IconName)
    ? (item.icon as IconName)
    : undefined;

  return (
    <Box twClassName="w-full flex-row items-center justify-between py-2 px-4">
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

      <Box twClassName="flex-row items-center">
        {item.isLoading && <Spinner />}
        {!item.isLoading &&
          item.actions.map((action, index) => (
            <Box
              key={`${item.name}-${action.buttonLabel}-${index}`}
              twClassName={index > 0 ? 'ml-2' : ''}
            >
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                onPress={action.onPress}
                isDisabled={action.isDisabled}
              >
                {action.buttonLabel}
              </Button>
            </Box>
          ))}
      </Box>
    </Box>
  );
}
