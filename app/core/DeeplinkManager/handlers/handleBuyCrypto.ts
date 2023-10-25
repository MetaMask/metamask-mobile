import { isNetworkBuySupported } from '../../../components/UI/Ramp/utils';
import Routes from '../../../constants/navigation/Routes';
import { RootState } from '../../../reducers';
import { chainIdSelector, getRampNetworks } from '../../../reducers/fiatOrders';
import { Store } from 'redux';
import { DeeplinkManager } from '../DeeplinkManager';

function handleBuyCrypto({ instance }: { instance: DeeplinkManager }) {
  instance.dispatch((_: any, getState: Store<RootState, any>['getState']) => {
    const state = getState();
    // Do nothing for now if use is not in a supported network
    if (isNetworkBuySupported(chainIdSelector(state), getRampNetworks(state))) {
      instance.navigation.navigate(Routes.FIAT_ON_RAMP_AGGREGATOR.ID);
    }
  });
}

export default handleBuyCrypto;
