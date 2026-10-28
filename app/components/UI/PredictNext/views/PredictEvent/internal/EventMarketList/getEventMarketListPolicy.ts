import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../../../util/deviceCapability/types';

const DEFAULT_RENDERING = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  windowSize: 21,
};
const LOW_HARDWARE_RENDERING = {
  initialNumToRender: 6,
  maxToRenderPerBatch: 6,
  windowSize: 5,
};

/** Rendering limits never truncate data or change venue-wide discovery. */
export const getEventMarketListPolicy = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
) => {
  // An unknown transport follows the product-default column of the UX matrix,
  // including on LOW hardware. Network never reclassifies hardware.
  const limitRendering = hardwareTier === 'LOW' && networkTier !== null;
  return limitRendering ? LOW_HARDWARE_RENDERING : DEFAULT_RENDERING;
};
