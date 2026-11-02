import React, { useCallback, useState, type ReactNode } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { EventMarketSectionTestIds } from './EventMarketSection.testIds';

export interface EventMarketSectionProps {
  title: string;
  /** Already formatted, such as `$1.2K`. */
  volume?: string;
  /** The first open state only; later changes are ignored. */
  initialOpen?: boolean;
  /** Called with the new open state after each header press. */
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}

/**
 * A collapsible Event screen section: a header with title, volume and a
 * chevron, and content below while open. Closed content is not rendered, so
 * its cards do no work until the section opens.
 */
export const EventMarketSection = ({
  title,
  volume,
  initialOpen = false,
  onToggle,
  children,
}: EventMarketSectionProps) => {
  const [open, setOpen] = useState(initialOpen);

  const handlePress = useCallback(() => {
    const nextOpen = !open;
    setOpen(nextOpen);
    onToggle?.(nextOpen);
  }, [onToggle, open]);

  const chevron = open ? 'up' : 'down';

  return (
    <Box>
      <SectionHeader
        isInteractive
        title={title}
        titleProps={{ variant: TextVariant.HeadingSm }}
        onPress={handlePress}
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        testID={EventMarketSectionTestIds.HEADER}
        twClassName="py-3.5"
        endAccessory={
          // SectionHeader's title box doesn't grow, so push the volume and
          // chevron to the trailing edge, 8px from the title at minimum.
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="ml-auto pl-1"
          >
            {volume ? (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                testID={EventMarketSectionTestIds.VOLUME}
              >
                {volume}
              </Text>
            ) : null}
            <Icon
              name={open ? IconName.ArrowUp : IconName.ArrowDown}
              size={IconSize.Lg}
              color={IconColor.IconDefault}
              testID={EventMarketSectionTestIds.CHEVRON(chevron)}
            />
          </Box>
        }
      />
      {open ? children : null}
    </Box>
  );
};
