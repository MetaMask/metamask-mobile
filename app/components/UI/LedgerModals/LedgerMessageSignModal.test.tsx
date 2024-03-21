import { renderScreen } from '../../../util/test/renderWithProvider';
import LedgerMessageSignModal from './LedgerMessageSignModal';
import { RPCStageTypes } from '../../../reducers/rpcEvents';

const initialState = {
  rpcEvents: { signingEvent: RPCStageTypes.IDLE },
};

describe('LedgerMessageSignModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      LedgerMessageSignModal,
      { name: 'LederMessageSignModal' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
