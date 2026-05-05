import React, { useCallback } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import type { RelatedAsset } from '@metamask/ai-controllers';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { getRelatedAssetImageSource } from '../utils/getRelatedAssetImageSource';

interface PerpsRowProps {
  asset: RelatedAsset;
}

/**
 * A single row in the Perps section of the expanded What's Happening card.
 * Displays the asset logo and symbol with a Trade button that navigates to
 * the Perps market details view. Extracted as its own component so hooks can
 * be called per-asset (hooks cannot be called inside a loop).
 */
const PerpsRow: React.FC<PerpsRowProps> = ({ asset }) => {
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  const hlPerpsMarket = asset.hlPerpsMarket?.[0];

  const handleTrade = useCallback(() => {
    if (!hlPerpsMarket) return;
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: { symbol: hlPerpsMarket, name: asset.name },
        source: PERPS_EVENT_VALUE.SOURCE.HOME_SECTION,
      },
    });
  }, [navigation, hlPerpsMarket, asset.name]);

  const rawImageSource = getRelatedAssetImageSource(asset);
  const imageSource = Array.isArray(rawImageSource)
    ? (rawImageSource[0] as { uri?: string } | undefined)
    : (rawImageSource as number | { uri?: string } | undefined);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="py-3"
    >
      <AvatarToken
        name={asset.name}
        size={AvatarTokenSize.Lg}
        src={imageSource ?? undefined}
      />

      <Box
        twClassName="flex-1"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {asset.symbol}
        </Text>

        <ButtonBase
          size={ButtonBaseSize.Md}
          twClassName="bg-background-default rounded-2xl px-4"
          onPress={handleTrade}
          accessibilityLabel={`${strings('bottom_nav.trade')} ${asset.symbol}`}
        >
          {strings('bottom_nav.trade')}
        </ButtonBase>
      </Box>
    </Box>
  );
};

export default PerpsRow;
