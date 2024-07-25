/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from '@tamagui/lucide-icons';

import { XStack } from 'tamagui';
import TamaguiPopover from './Popover';

const PopoverMeta = {
  title: 'Component Library / Popover',
  component: TamaguiPopover,
};
export default PopoverMeta;

export const Popover = {
  render: () => (
    <XStack gap="$2" flex={1} justifyContent="center" alignItems="center">
      <TamaguiPopover placement="left" Icon={ChevronLeft} Name="left-popover" />

      <TamaguiPopover
        placement="bottom"
        Icon={ChevronDown}
        Name="bottom-popover"
      />

      <TamaguiPopover placement="top" Icon={ChevronUp} Name="top-popover" />

      <TamaguiPopover
        placement="right"
        Icon={ChevronRight}
        Name="right-popover"
      />
    </XStack>
  ),
};
