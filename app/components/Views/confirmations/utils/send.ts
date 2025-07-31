import { Nft } from '@metamask/assets-controllers';

import Routes from '../../../../constants/navigation/Routes';
import { AssetType } from '../types/token';

export const isSendRedesignEnabled = () =>
  process.env.MM_SEND_REDESIGN_ENABLED === 'true';

export const handleSendPageNavigation = (
  navigate: <RouteName extends string>(
    screenName: RouteName,
    params?: object,
  ) => void,
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
