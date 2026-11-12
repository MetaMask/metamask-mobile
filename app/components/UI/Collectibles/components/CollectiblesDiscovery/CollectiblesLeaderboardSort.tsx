import React, { useState } from 'react';
import {
  ButtonBase,
  ButtonBaseSize,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { CollectiblesLeaderboardSort } from '../../services/clients/CollectiblesSocialApiClient';
import DiscoveryOptionsSheet from './DiscoveryOptionsSheet';

/** Same metric dropdown for Popular's preview and the full leaderboard. */
export default function CollectiblesLeaderboardSortControl({
  value,
  onChange,
}: {
  value: CollectiblesLeaderboardSort;
  onChange: (value: CollectiblesLeaderboardSort) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ButtonBase
        size={ButtonBaseSize.Sm}
        startIconName={IconName.SwapVertical}
        twClassName="rounded-full bg-muted px-3"
        onPress={() => setOpen(true)}
        testID="collectibles-leaderboard-sort"
      >
        {strings(`collectibles_discovery.${value}`)}
      </ButtonBase>
      {open && (
        <DiscoveryOptionsSheet
          title={strings('collectibles_discovery.sort_by')}
          value={value}
          options={(
            [
              'collectiblesVolume',
              'collectiblesEpic',
              'collectiblesPacks',
              'collectiblesPokedex',
            ] as const
          ).map((metric) => ({
            value: metric,
            label: strings(`collectibles_discovery.${metric}`),
          }))}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
