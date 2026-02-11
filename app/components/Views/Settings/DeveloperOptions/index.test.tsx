import { backgroundState } from '../../../../util/test/initial-root-state';
import DeveloperOptions from './';
import { renderScreen } from '../../../../util/test/renderWithProvider';

const mockSelectPerpsEnabledFlag = jest.fn();
const mockSelectIsMusdConversionFlowEnabledFlag = jest.fn();

jest.mock('../../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: () => mockSelectPerpsEnabledFlag(),
}));

jest.mock('../../../UI/Earn/selectors/featureFlags', () => {
  const actual = jest.requireActual('../../../UI/Earn/selectors/featureFlags');
  return {
    ...actual,
    selectIsMusdConversionFlowEnabledFlag: () =>
      mockSelectIsMusdConversionFlowEnabledFlag(),
  };
});

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('DeveloperOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectPerpsEnabledFlag.mockReturnValue(true);
    mockSelectIsMusdConversionFlowEnabledFlag.mockReturnValue(false);
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
