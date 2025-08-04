import { backgroundState } from '../../../../util/test/initial-root-state';
import DeveloperOptions from './';
import { renderScreen } from '../../../../util/test/renderWithProvider';

const mockSelectPerpsEnabledFlag = jest.fn();

jest.mock('../../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: () => mockSelectPerpsEnabledFlag(),
}));

const initialState = {
  DeveloperOptions: {},
  engine: {
    backgroundState,
  },
};

describe('DeveloperOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectPerpsEnabledFlag.mockReturnValue(true);
  });

  it('renders correctly', () => {
    const { toJSON } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('does not render PerpsDeveloperOptionsSection when Perps is not enabled', () => {
    mockSelectPerpsEnabledFlag.mockReturnValue(false);

    const { queryByText } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
    );

    expect(queryByText('Perpetual Trading')).toBeNull();
  });
});
