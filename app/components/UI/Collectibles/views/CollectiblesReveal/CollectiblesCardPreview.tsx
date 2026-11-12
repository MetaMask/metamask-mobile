import { getCardTitle } from '../../components/CardDisplay/cardLabels';
import React, { useCallback } from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  HeaderStandard,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppStackNavigationProp } from '../../../../../core/NavigationService/types';
import PackReveal from '../../components/PackReveal';
import OwnedCardState from '../../components/CardDisplay/OwnedCardState';
import { CollectiblesRevealTestIds } from '../../Collectibles.testIds';
import { usePackPartnerCard } from '../../providers/pack-partner/hooks/usePackPartnerCards';

/** Replays a collected card without mounting the purchase or buyback flows. */
const CollectiblesCardPreview = ({ mint }: { mint: string }) => {
  const tw = useTailwind();
  const navigation = useNavigation<AppStackNavigationProp>();
  const isFocused = useIsFocused();
  const { card, isLoading, error, refetch } = usePackPartnerCard(mint);
  const close = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView
      edges={card ? ['top', 'left', 'right'] : ['left', 'right']}
      style={tw.style('flex-1 bg-default')}
      testID={CollectiblesRevealTestIds.CONTAINER}
    >
      {!card && (
        <HeaderStandard
          includesTopInset
          onClose={close}
          closeButtonProps={{ testID: CollectiblesRevealTestIds.CLOSE_BUTTON }}
        />
      )}
      {card ? (
        <PackReveal
          key={card.mint}
          name={getCardTitle(card)}
          image={card.image}
          previewImage={card.mediumImage}
          year={card.year}
          gradingCompany={card.gradingCompany}
          grade={card.grade}
          rarity={card.rarity}
          isActive={isFocused}
          onRevealed={close}
        />
      ) : (
        <OwnedCardState
          isLoading={isLoading}
          error={error}
          onRetry={() => {
            refetch().catch(() => undefined);
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default CollectiblesCardPreview;
