import React, { useEffect, useState } from 'react';
import {
  getCardTitle,
  getGradeLabel,
} from '../components/CardDisplay/cardLabels';
import CollectiblesShareComposer from '../components/CollectiblesShareComposer/CollectiblesShareComposer';
import type { CollectiblesCard } from '../types';
import type { CollectiblesCardShareSnapshot } from '../services/clients/CollectiblesSocialApiClient';
import { usePackPartnerAccount } from '../providers/pack-partner/hooks/usePackPartnerAccount';

/** Snapshot once when opening the composer; later wallet updates cannot change the draft. */
export function useCollectiblesShare() {
  const account = usePackPartnerAccount();
  const [cards, setCards] = useState<CollectiblesCardShareSnapshot[]>();
  useEffect(() => setCards(undefined), [account?.address]);
  const open = async (selected: CollectiblesCard[]) => {
    setCards(
      selected.map((card) => ({
        provider: 'pack-partner',
        mint: card.mint,
        name: getCardTitle(card),
        imageUrl: card.mediumImage ?? card.image ?? null,
        insuredValueUsd: card.insuredValue?.toString() ?? null,
        rarity: card.rarity,
        grade: getGradeLabel(card),
        memo: card.memo,
        batchId: card.batchId,
      })),
    );
  };
  return {
    open,
    composer: cards ? (
      <CollectiblesShareComposer
        cards={cards}
        onClose={() =>
          setCards((current) => (current === cards ? undefined : current))
        }
      />
    ) : null,
  };
}
