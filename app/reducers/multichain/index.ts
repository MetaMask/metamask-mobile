///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { MultichainSettingsState } from '../../actions/multichain/state';

export const initialState: MultichainSettingsState = {
  bitcoinSupportEnabled: true,
  bitcoinTestnetSupportEnabled: true,
  solanaSupportEnabled: true,
};

const multichainReducer = (state = initialState) => state;

export default multichainReducer;
///: END:ONLY_INCLUDE_IF
