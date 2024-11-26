import { MultichainSettingsState } from '../../actions/multichain/state';

export const initialState: MultichainSettingsState = {
  bitcoinSupportEnabled: true,
  bitcoinTestnetSupportEnabled: true,
};

const multichainReducer = (state = initialState) => state;

export default multichainReducer;
