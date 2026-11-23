import React from 'react';
import { useLinkProps } from '@react-navigation/native';
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
import { Pressable } from '../../primitives/Pressable';
import { collectiblesRoutes, type CollectiblesParamList } from '../routeNames';

// Tile width in px (w-48). The carousel snaps by it too.
export const packTileWidth = 192;

// The flame shows next to the counter from this many opens.
const flameThreshold = 20_000;

interface Props {
  pack: HomePack;
}

export function PackTile({ pack }: Props) {
  const formattedCount = getIntlNumberFormatter(I18n.locale).format(
    pack.openedCount,
  );
  const isTrending = pack.openedCount >= flameThreshold;

  const buySheetLink = useLinkProps<CollectiblesParamList>({
    screen: collectiblesRoutes.buySheet,
    params: { packCode: pack.code },
  });

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
            { count: pack.openedCount, formattedCount },
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
              {formattedCount}
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
        <Pressable
          {...buySheetLink}
          role="button"
          accessibilityRole="button"
          className="self-start"
          pressedClassName="opacity-70"
          accessibilityHint={strings('collectibles.buy_sheet.open_hint', {
            name: pack.name,
          })}
          // Grows the small text target to about 44pt.
          hitSlop={11}
          testID={collectiblesTestIds.buyButton(pack.code)}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {pack.priceLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
