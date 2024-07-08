import { renderScreen } from '../../../util/test/renderWithProvider';
import AccountRightButton from './';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
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
