import { Nft } from '@metamask/assets-controllers';

import Routes from '../../../../constants/navigation/Routes';
import { AssetType } from '../types/token';

interface NavigateType {
  <RouteName extends string>(
    ...args: [RouteName] | [RouteName, object | undefined]
  ): void;
  <RouteName extends string>(
    route:
      | { key: string; params?: object | undefined }
      | {
          name: RouteName;
          key?: string | undefined;
          params: object | undefined;
        },
  ): void;
}

export const isSendRedesignEnabled = () =>
  process.env.MM_SEND_REDESIGN_ENABLED === 'true';

export const handleSendPageNavigation = (
  navigate: NavigateType,
  asset: AssetType | Nft,
) => {
  if (isSendRedesignEnabled()) {
    navigate(Routes.SEND.DEFAULT, {
      screen: Routes.SEND.ROOT,
      params: {
        asset,
      },
    });
  } else {
    navigate('SendFlowView');
  }
};
