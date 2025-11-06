import {
  renderScreen,
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import BridgeView from '..';
import { RootState } from '../../../../../../reducers';

type Params = Record<string, unknown>;

export const renderBridgeScreen = (
  state?: DeepPartial<RootState>,
  params?: Params,
) =>
  renderScreen(
    BridgeView,
    {
      name: Routes.BRIDGE.ROOT,
    },
    { state },
    params as Record<string, unknown>,
  );
