import React, { useCallback, useState } from 'react';
import { Image } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { strings } from '../../../../locales/i18n';
import robinhoodIcon from '../../../images/robinhood.png';
import { NetworkToCaipChainId } from '../NetworkMultiSelector/NetworkMultiSelector.constants';
import Routes from '../../../constants/navigation/Routes';
import {
  ROBINHOOD_EXPLORE_BANNER_DISMISSED,
  ROBINHOOD_SWAPS_BANNER_DISMISSED,
} from '../../../constants/storage';
import StorageWrapper from '../../../store/storage-wrapper';
import { TokenDetailsSource } from '../TokenDetails/constants/constants';
import { DismissableBanner } from '../DismissableBanner';

export const ROBINHOOD_BANNER_TEST_ID = 'robinhood-banner';
export const ROBINHOOD_BANNER_DISMISS_TEST_ID = 'robinhood-banner-dismiss';

/** Screen the banner is rendered on. Each surface dismisses independently. */
export enum RobinhoodBannerSurface {
  Swaps = 'swaps',
  ExploreCrypto = 'explore-crypto',
}

const SURFACE_CONFIG: Record<
  RobinhoodBannerSurface,
  { storageKey: string; tokenDetailsSource: TokenDetailsSource }
> = {
  [RobinhoodBannerSurface.Swaps]: {
    storageKey: ROBINHOOD_SWAPS_BANNER_DISMISSED,
    tokenDetailsSource: TokenDetailsSource.BannerRobinhoodSwaps,
  },
  [RobinhoodBannerSurface.ExploreCrypto]: {
    storageKey: ROBINHOOD_EXPLORE_BANNER_DISMISSED,
    tokenDetailsSource: TokenDetailsSource.BannerRobinhoodExplore,
  },
};

export function useRobinhoodBanner(surface: RobinhoodBannerSurface) {
  const { storageKey, tokenDetailsSource } = SURFACE_CONFIG[surface];
  const navigation = useNavigation<AppNavigationProp>();
  const [isDismissed, setIsDismissed] = useState(
    () => StorageWrapper.getItemSync(storageKey) === 'true',
  );

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    StorageWrapper.setItem(storageKey, 'true').catch(() => undefined);
  }, [storageKey]);

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW, {
      initialNetwork: [NetworkToCaipChainId.ROBINHOOD],
      tokenDetailsSource,
    });
  }, [navigation, tokenDetailsSource]);

  return {
    dismiss,
    handlePress,
    shouldShow: !isDismissed,
  };
}

interface RobinhoodBannerProps {
  onDismiss: () => void;
  onPress: () => void;
}

export function RobinhoodBanner({ onDismiss, onPress }: RobinhoodBannerProps) {
  const tw = useTailwind();

  return (
    <DismissableBanner
      title={strings('bridge.robinhood_banner_title')}
      description={strings('bridge.robinhood_banner_subtitle')}
      onPress={onPress}
      onDismiss={onDismiss}
      testID={ROBINHOOD_BANNER_TEST_ID}
      dismissTestID={ROBINHOOD_BANNER_DISMISS_TEST_ID}
      icon={
        <Box twClassName="h-10 w-10 items-center justify-center overflow-hidden rounded-full">
          <Image
            source={robinhoodIcon}
            resizeMode="cover"
            style={tw.style('h-12 w-12')}
          />
        </Box>
      }
    />
  );
}
