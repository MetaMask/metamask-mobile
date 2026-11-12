import React from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { CollectiblesHomeTestIds } from '../../Collectibles.testIds';
import CollectiblesMotion from '../../components/CollectiblesMotion/CollectiblesMotion';
import { PACK_PARTNER_CONFIG } from '../../providers/pack-partner/constants';

/** The Replit Market teaser keeps its authored scenes; transactions stay in the partner browser. */
export default function MarketTab({ bottomInset }: { bottomInset: number }) {
  const navigation = useNavigation<AppNavigationProp>();
  const isFocused = useIsFocused();
  return (
    <Box
      testID={CollectiblesHomeTestIds.MARKET}
      twClassName="flex-1"
      style={{ paddingBottom: bottomInset }}
    >
      <CollectiblesMotion
        configuration={{
          kind: 'marketplace',
          identity: 'collectibles-market',
          name: strings('collectibles_discovery.market_coming_soon'),
          front: '',
          soldLabel: strings('collectibles_discovery.sold'),
        }}
        isActive={isFocused}
      />
      <Box paddingHorizontal={4}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!PACK_PARTNER_CONFIG.websiteUrl}
          testID={CollectiblesHomeTestIds.MARKET_OPEN_PARTNER}
          onPress={() => {
            if (!PACK_PARTNER_CONFIG.websiteUrl) return;
            navigation.navigate(Routes.BROWSER.HOME, {
              screen: Routes.BROWSER.VIEW,
              params: {
                newTabUrl: `${PACK_PARTNER_CONFIG.websiteUrl}/marketplace/cards`,
                linkType: EXTERNAL_LINK_TYPE,
                timestamp: Date.now(),
              },
            });
          }}
        >
          {strings('collectibles_discovery.market_open_partner')}
        </Button>
      </Box>
    </Box>
  );
}
