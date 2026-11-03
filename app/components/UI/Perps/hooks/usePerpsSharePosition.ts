import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { Position } from '@metamask/perps-controller';
import type { Position as SocialPosition } from '@metamask/social-controllers';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { usePerpsCanPostPosition } from './usePerpsCanPostPosition';

interface PerpsShareRequest {
  position: Position;
  marketPrice?: string;
  accountAddress?: string;
}

export interface UsePerpsSharePositionResult {
  sharePosition: (position: Position, marketPrice?: string) => void;
  findSocialPosition: (position: Position) => SocialPosition | undefined;
}

export const usePerpsSharePosition = (): UsePerpsSharePositionResult => {
  const navigation = useNavigation<AppNavigationProp>();
  const { accountAddress, findSocialPosition: findSocialPositionForAccount } =
    usePerpsCanPostPosition();

  const openShare = useCallback(
    ({
      position,
      marketPrice,
      accountAddress: shareAccount,
    }: PerpsShareRequest) => {
      const socialPosition = findSocialPositionForAccount(
        position,
        shareAccount,
      );
      if (socialPosition) {
        navigation.navigate(Routes.PERPS.MODALS.ROOT, {
          screen: Routes.PERPS.MODALS.SHARE_POSITION,
          params: {
            position,
            marketPrice,
            accountAddress: shareAccount,
            socialPosition,
          },
        });
        return;
      }
      navigation.navigate(Routes.PERPS.PNL_HERO_CARD, {
        position,
        marketPrice,
      });
    },
    [findSocialPositionForAccount, navigation],
  );

  const sharePosition = useCallback(
    (position: Position, marketPrice?: string) => {
      openShare({ position, marketPrice, accountAddress });
    },
    [accountAddress, openShare],
  );

  const findSocialPosition = useCallback(
    (position: Position) => findSocialPositionForAccount(position),
    [findSocialPositionForAccount],
  );

  return { sharePosition, findSocialPosition };
};
