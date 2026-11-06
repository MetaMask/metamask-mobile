import { backgroundState } from '../../../../util/test/initial-root-state';
import DeveloperOptions from './';
import { renderScreen } from '../../../../util/test/renderWithProvider';

const mockSelectPerpsEnabledFlag = jest.fn();
const mockSelectIsMusdConversionFlowEnabledFlag = jest.fn();

jest.mock('../../../UI/Perps/selectors/featureFlags', () => ({
  ...jest.requireActual('../../../UI/Perps/selectors/featureFlags'),
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
    const { getByText } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
    );
    expect(getByText('Developer options')).toBeOnTheScreen();
  });

  it('renders back button when opened from settings', () => {
    const { getByTestId, queryByTestId } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
    );

    expect(getByTestId('developer-options-back-button')).toBeOnTheScreen();
    expect(queryByTestId('developer-options-close-button')).toBeNull();
  });

  it('renders close button when opened as a full-screen modal', () => {
    const { getByTestId, queryByTestId } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
      { isFullScreenModal: true },
    );

    expect(getByTestId('developer-options-close-button')).toBeOnTheScreen();
    expect(queryByTestId('developer-options-back-button')).toBeNull();
  });

  it('does not render PerpsDeveloperOptionsSection when Perps is not enabled', () => {
    mockSelectPerpsEnabledFlag.mockReturnValue(false);

    const { queryByText } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
    );

    expect(queryByText('Perpetual Trading')).not.toBeOnTheScreen();
  });

  describe('watch-only account section', () => {
    const originalFlag = process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED;
    const originalEnvironment = process.env.METAMASK_ENVIRONMENT;

    afterEach(() => {
      process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = originalFlag;
      process.env.METAMASK_ENVIRONMENT = originalEnvironment;
      if (originalFlag === undefined) {
        delete process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED;
      }
      if (originalEnvironment === undefined) {
        delete process.env.METAMASK_ENVIRONMENT;
      }
    });

    const renderDeveloperOptions = () =>
      renderScreen(
        DeveloperOptions,
        { name: 'DeveloperOptions' },
        { state: initialState },
      );

    it('is hidden when the build flag is off', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = 'false';

      const { queryByTestId } = renderDeveloperOptions();

      expect(queryByTestId('watch-only-address-input')).toBeNull();
      expect(queryByTestId('watch-only-add-button')).toBeNull();
    });

    it('is hidden outside dev builds even with the flag on', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = 'true';

      const { queryByTestId } = renderDeveloperOptions();

      expect(queryByTestId('watch-only-address-input')).toBeNull();
    });

    it('is shown in dev builds with the flag on', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = 'true';

      const { getByTestId } = renderDeveloperOptions();

      expect(getByTestId('watch-only-address-input')).toBeOnTheScreen();
      expect(getByTestId('watch-only-add-button')).toBeOnTheScreen();
    });
  });
});
