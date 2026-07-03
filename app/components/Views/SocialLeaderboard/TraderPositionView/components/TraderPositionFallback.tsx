import React, { useCallback } from 'react';
import { Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useAssetFromTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import errorStateLight from '../../../../../images/error-state-no-connection-light.png';
import errorStateDark from '../../../../../images/error-state-no-connection-dark.png';

interface TraderPositionFallbackProps {
  traderId: string;
  traderName?: string;
}

/**
 * Fallback state rendered when the canonical position cannot be resolved
 * (no match after fetch, or a fetch error). Routes back to the trader's
 * profile page if a traderId is available, otherwise back to the leaderboard.
 */
const TraderPositionFallback: React.FC<TraderPositionFallbackProps> = ({
  traderId,
  traderName,
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const noConnectionImage = useAssetFromTheme(errorStateLight, errorStateDark);

  const handlePrimaryAction = useCallback(() => {
    if (traderId) {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
        traderId,
        traderName: traderName ?? '',
      });
    } else {
      navigation.navigate(Routes.SOCIAL_LEADERBOARD.VIEW);
    }
  }, [navigation, traderId, traderName]);

  const actionLabel = traderId
    ? strings('social_leaderboard.trader_position.fallback_back_to_profile')
    : strings(
        'social_leaderboard.trader_position.fallback_back_to_leaderboard',
      );

  return (
    <Box
      alignItems={BoxAlignItems.Center}
      gap={3}
      padding={4}
      testID={TraderPositionViewSelectorsIDs.FALLBACK}
    >
      <Image
        source={noConnectionImage}
        resizeMode="contain"
        style={tw.style('w-[72px] h-[72px]')}
      />
      <Text
        variant={TextVariant.HeadingSm}
        color={TextColor.TextDefault}
        twClassName="text-center"
      >
        {strings('social_leaderboard.trader_position.fallback_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="text-center"
      >
        {strings('social_leaderboard.trader_position.fallback_subtitle')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handlePrimaryAction}
        testID={TraderPositionViewSelectorsIDs.FALLBACK_PRIMARY_ACTION}
        twClassName="self-center"
      >
        {actionLabel}
      </Button>
    </Box>
  );
};

export default TraderPositionFallback;
