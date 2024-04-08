import { renderScreen } from '../../../util/test/renderWithProvider';
import AccountRightButton from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      NetworkController: {
        providerConfig: {
          chainId: 0x1,
        },
      },
    },
  },
};

describe('AccountRightButton', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      AccountRightButton,
      {
        name: 'AccountRightButton',
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
