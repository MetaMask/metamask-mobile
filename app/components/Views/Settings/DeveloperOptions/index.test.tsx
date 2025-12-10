import { backgroundState } from '../../../../util/test/initial-root-state';
import DeveloperOptions from './';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import {
  useFeatureFlag,
  FeatureFlagNames,
} from '../../../hooks/useFeatureFlag';

const mockUseFeatureFlag = useFeatureFlag as jest.MockedFunction<
  typeof useFeatureFlag
>;

jest.mock('../../../hooks/useFeatureFlag', () => {
  const actual = jest.requireActual('../../../hooks/useFeatureFlag');
  return {
    ...actual,
    useFeatureFlag: jest.fn(),
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
    mockUseFeatureFlag.mockImplementation((flagName) => {
      if (flagName === FeatureFlagNames.perpsPerpTradingEnabled) {
        return true;
      }
      return false;
    });
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
    mockUseFeatureFlag.mockImplementation((flagName) => {
      if (flagName === FeatureFlagNames.perpsPerpTradingEnabled) {
        return false;
      }
      return false;
    });

    const { queryByText } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
    );

    expect(queryByText('Perpetual Trading')).toBeNull();
  });
});
