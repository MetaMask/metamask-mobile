import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import {
  mapDefiProtocolDetailsPositionV2ToToken,
  type DeFiDetailsPositionTokenV2,
} from './map-defi-protocol-details-position-v2';

export type DeFiProtocolPositionGroupListItem =
  | { type: 'header'; key: string; productName: string }
  | { type: 'token'; key: string; token: DeFiDetailsPositionTokenV2 }
  | { type: 'separator'; key: string };

/**
 * Flattens protocol-details sections into list rows so FlashList can
 * virtualize at the token-row level instead of the section level.
 */
export function flattenDefiProtocolPositionGroupSections(
  sections: DeFiProtocolPositionGroup['sections'],
): DeFiProtocolPositionGroupListItem[] {
  const items: DeFiProtocolPositionGroupListItem[] = [];

  sections.forEach((section, sectionIndex) => {
    items.push({
      type: 'header',
      key: `header-${sectionIndex}-${section.productName}`,
      productName: section.productName,
    });

    section.positions.forEach((position) => {
      const token = mapDefiProtocolDetailsPositionV2ToToken(position);
      items.push({
        type: 'token',
        key: token.key,
        token,
      });
    });

    if (sectionIndex < sections.length - 1) {
      items.push({
        type: 'separator',
        key: `separator-${sectionIndex}-${section.productName}`,
      });
    }
  });

  return items;
}
