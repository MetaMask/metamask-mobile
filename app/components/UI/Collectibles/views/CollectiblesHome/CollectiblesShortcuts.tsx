import React from 'react';
import {
  Box,
  ButtonBase,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import CollectiblesShortcutIcon from './CollectiblesShortcutIcon';
import { strings } from '../../../../../../locales/i18n';
import { CollectiblesHomeTestIds } from '../../Collectibles.testIds';

const SHORTCUTS = [
  {
    key: 'packs',
    label: 'collectibles.tabs.packs',
    testID: CollectiblesHomeTestIds.PACKS_TAB,
  },
  {
    key: 'cards',
    label: 'collectibles.tabs.cards',
    testID: CollectiblesHomeTestIds.CARDS_TAB,
  },
  {
    key: 'market',
    label: 'collectibles_discovery.market',
    testID: CollectiblesHomeTestIds.MARKET_TAB,
  },
] as const;

/** Replit TradeCollectiblesTop: three ordinary links in the scrolling home content. */
export default function CollectiblesShortcuts({
  onOpen,
}: {
  onOpen: (section: 'packs' | 'cards' | 'market') => void;
}) {
  return (
    <Box
      twClassName="flex-row gap-2 px-4 pb-4"
      testID="collectibles-home-shortcuts"
    >
      {SHORTCUTS.map(({ key, label, testID }) => (
        <ButtonBase
          key={key}
          onPress={() => onOpen(key)}
          accessibilityLabel={strings(label)}
          testID={testID}
          twClassName="flex-1 h-18 rounded-xl bg-muted p-3"
          contentWrapperProps={{ twClassName: 'flex-col gap-1' }}
        >
          <CollectiblesShortcutIcon section={key} />
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            {strings(label)}
          </Text>
        </ButtonBase>
      ))}
    </Box>
  );
}
