import React from 'react';
import {
  FontWeight,
  Icon,
  IconName,
  IconSize,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import type { HomePack } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { View } from '../../primitives/View';
import { Text } from '../../primitives/Text';
import { CapsuleGlass } from '../../primitives/CapsuleGlass';

// Tile width in px (w-48). The carousel snaps by it too.
export const packTileWidth = 192;

// The flame shows next to the counter from this many opens.
const flameThreshold = 20_000;

interface Props {
  pack: HomePack;
}

export function PackTile({ pack }: Props) {
  const count = getIntlNumberFormatter(I18n.locale).format(pack.openedCount);
  const isTrending = pack.openedCount >= flameThreshold;

  return (
    <View className="w-48 gap-2" testID={collectiblesTestIds.tile(pack.code)}>
      <View className="overflow-hidden rounded-xl bg-muted p-3">
        {/* Grey placeholder until pack art comes from a remote host */}
        <View className="h-[276px] w-full rounded-lg bg-alternative" />
        {/* One label for the counter so the flame isn't lost on screen readers */}
        <View
          className="absolute left-2 top-2"
          accessible
          accessibilityLabel={strings(
            isTrending
              ? 'collectibles.home.opens_trending'
              : 'collectibles.home.opens',
            { count },
          )}
        >
          <CapsuleGlass className="h-6 gap-1 px-2">
            {isTrending && (
              <Icon
                name={IconName.Fire}
                size={IconSize.Xs}
                testID={collectiblesTestIds.flame(pack.code)}
              />
            )}
            <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
              {count}
            </Text>
          </CapsuleGlass>
        </View>
      </View>
      <View>
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {pack.name}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {pack.subtitle}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {pack.priceLabel}
        </Text>
      </View>
    </View>
  );
}
