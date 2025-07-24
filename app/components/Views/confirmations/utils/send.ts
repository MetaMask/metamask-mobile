import { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { AssetType } from '../types/token';
import { Nft } from '@metamask/assets-controllers';

export const isSendRedesignEnabled = () =>
  process.env.MM_SEND_REDESIGN_ENABLED === 'true';

export const handleSendPageNavigation = (
  navigation: NavigationProp<ParamListBase>,
  asset: AssetType | Nft,
) => {
  if (isSendRedesignEnabled()) {
    navigation.navigate(Routes.SEND.DEFAULT, {
      screen: Routes.SEND.ROOT,
      params: {
        asset,
      },
    });
  } else {
    navigation.navigate('SendFlowView', {});
  }
};
