import React from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import { ChoosePasswordRouteParams } from './ChoosePassword.types';
import { getChoosePasswordFlow } from './getChoosePasswordFlow';
import SrpCreateWallet from './flows/SrpCreateWallet';
import SocialCreateWallet from './flows/SocialCreateWallet';
import RecoveryResetPassword from './flows/RecoveryResetPassword';

const ChoosePassword = () => {
  const route =
    useRoute<RouteProp<{ params: ChoosePasswordRouteParams }, 'params'>>();
  const params = route.params;

  switch (getChoosePasswordFlow(params)) {
    case 'recovery_reset':
      return <RecoveryResetPassword params={params} />;
    case 'social_create':
      return <SocialCreateWallet params={params} />;
    default:
      return <SrpCreateWallet params={params} />;
  }
};

export default ChoosePassword;
