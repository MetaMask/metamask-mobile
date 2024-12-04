import { MultichainSettingsState } from '../../actions/multichain/state';

export const initialState: MultichainSettingsState = {
  bitcoinSupportEnabled: false,
  bitcoinTestnetSupportEnabled: false,
};

const multichainReducer = (state = initialState) => state;

export default multichainReducer;
