import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type {
  CollectiblesInventoryCard,
  CollectiblesWalletAccount,
} from '../../types';
import CollectiblesPublicCard, {
  type PublicCardSaleReceipt,
} from '../CollectiblesPack/CollectiblesPublicCard';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { usePackPartnerPacks } from '../../providers/pack-partner/hooks/usePackPartnerPacks';
import { usePackPartnerAccount } from '../../providers/pack-partner/hooks/usePackPartnerAccount';
import { useUsdcBalance } from '../../providers/pack-partner/hooks/useUsdcBalance';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import PackPurchaseSheet from '../../components/PackPurchaseSheet';
import { resolveDiscoveryPack } from '../../components/CollectiblesDiscovery/discoveryPack';

/** Public and historical discovery share the same read-only interactive card screen. */
export function DiscoveryCardDetail({
  card,
  onClose,
  saleReceipt,
  sourcePackType,
  sourcePackName,
  caption,
}: {
  card: CollectiblesInventoryCard;
  onClose: () => void;
  caption?: string;
  saleReceipt?: PublicCardSaleReceipt;
  sourcePackType?: string;
  sourcePackName?: string;
}) {
  const navigation = useNavigation<AppNavigationProp>();
  const { packs } = usePackPartnerPacks({ enabled: !saleReceipt });
  const account = usePackPartnerAccount();
  const balance = useUsdcBalance();
  const [reviewAccount, setReviewAccount] =
    useState<CollectiblesWalletAccount>();
  const { source, buyPack } = resolveDiscoveryPack(card, packs, sourcePackType);
  if (
    reviewAccount &&
    (reviewAccount.id !== account?.id ||
      reviewAccount.address !== account?.address)
  ) {
    setReviewAccount(undefined);
  }
  if (reviewAccount && buyPack && !saleReceipt) {
    return (
      <PackPurchaseSheet
        pack={buyPack}
        account={reviewAccount}
        balance={balance.baseUnits}
        onClose={() => setReviewAccount(undefined)}
        onPurchased={(purchaseMemo, options) => {
          onClose();
          navigation.navigate(Routes.COLLECTIBLES.REVEAL, {
            memo: purchaseMemo,
            skipReveal: options?.skipReveal,
          });
        }}
      />
    );
  }
  return (
    <CollectiblesPublicCard
      card={card}
      onClose={onClose}
      saleReceipt={saleReceipt}
      contextLabel={caption}
      sourcePackName={
        source
          ? (getCollectiblesPackArtwork(`pack_partner:${source.code}`).name ??
            source.name)
          : sourcePackName
      }
      onBuyPack={
        buyPack && account && !saleReceipt
          ? () => setReviewAccount(account)
          : undefined
      }
    />
  );
}
