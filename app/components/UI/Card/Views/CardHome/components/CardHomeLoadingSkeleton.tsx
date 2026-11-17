import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { CardHomeSelectors } from '../CardHome.testIds';

/** Same art ratio as `CardImage` / `CardImageSection`. */
const CARD_ART_ASPECT_RATIO = 851 / 540;

/**
 * MainActionButton is Icon Lg (24) + BodySm + py-3 + mt-0.5, which lands at
 * about 73pt. The four tiles use this height so they match
 * `CardHomeActionButtonRow`.
 */
const ACTION_TILE_HEIGHT_CLASS = 'h-[73px]';

/**
 * FilterButton Sm is 32pt (`h-8`); SegmentedControl adds `p-1` and a 1pt
 * border, so the track is 42pt.
 */
const SEGMENT_PILL_HEIGHT_CLASS = 'h-[42px]';

const ACTION_TILE_INDEXES = [0, 1, 2, 3];
const ACTIVITY_ROW_INDEXES = [0, 1, 2];

/**
 * A02 Card home loading skeleton. Mirrors the loaded layout and spacing
 * (balance, uncontained card art, four action tiles, segment pill, three
 * Activity-shaped rows) so content does not jump when data arrives. Does not
 * include the Apple Wallet button. Uses the test-safe MMDS Skeleton wrapper
 * (same as Money home).
 */
const CardHomeLoadingSkeleton = (): React.JSX.Element => {
  const tw = useTailwind();

  return (
    <Box testID={CardHomeSelectors.LOADING_SKELETON}>
      <Box twClassName="px-4 pt-1" testID={CardHomeSelectors.BALANCE_HEADER}>
        <Skeleton
          twClassName="h-14 w-40 rounded-xl"
          testID={CardHomeSelectors.BALANCE_SKELETON}
        />
      </Box>
      <Box twClassName="px-4 mt-1 h-6 justify-center">
        <Skeleton
          twClassName="h-5 w-36 rounded-md"
          testID={CardHomeSelectors.BALANCE_SUBTITLE_SKELETON}
        />
      </Box>

      <Box twClassName="mx-4 mt-6">
        <Box
          twClassName="w-full overflow-hidden rounded-xl"
          style={{ aspectRatio: CARD_ART_ASPECT_RATIO }}
          testID={CardHomeSelectors.CARD_ART_SKELETON}
        >
          <Skeleton height="100%" width="100%" style={tw.style('rounded-xl')} />
        </Box>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="px-4 pt-4 pb-2 gap-2"
      >
        {ACTION_TILE_INDEXES.map((index) => (
          <Box key={index} twClassName="flex-1">
            <Skeleton
              twClassName={`${ACTION_TILE_HEIGHT_CLASS} w-full rounded-2xl`}
              testID={`${CardHomeSelectors.ACTION_TILE_SKELETON}-${index}`}
            />
          </Box>
        ))}
      </Box>

      <Box twClassName="px-4 mt-4 mb-4">
        <Skeleton
          twClassName={`${SEGMENT_PILL_HEIGHT_CLASS} w-full rounded-full`}
          testID={CardHomeSelectors.SEGMENTS_SKELETON}
        />
      </Box>

      {ACTIVITY_ROW_INDEXES.map((index) => (
        <Box
          key={index}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Start}
          twClassName="px-4 py-3 gap-4"
          testID={`${CardHomeSelectors.ACTIVITY_ROW_SKELETON}-${index}`}
        >
          <Skeleton twClassName="h-10 w-10 shrink-0 rounded-full" />
          <Box twClassName="min-w-0 flex-1 gap-1">
            <Skeleton twClassName="h-4 w-32 rounded-md" />
            <Skeleton twClassName="h-3 w-24 rounded-md" />
          </Box>
          <Box twClassName="items-end gap-1">
            <Skeleton twClassName="h-4 w-16 rounded-md" />
            <Skeleton twClassName="h-3 w-12 rounded-md" />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default CardHomeLoadingSkeleton;
