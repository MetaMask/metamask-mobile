import { backgroundState } from '../../../../util/test/initial-root-state';
import DeveloperOptions from './';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';
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

  it('does not render the watch-only section outside dev builds', () => {
    const { queryByTestId } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
    );

    expect(
      queryByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_START_BUTTON),
    ).toBeNull();
  });

  it('renders the watch-only section in dev builds', () => {
    // __DEV__ is a bare global injected by RN/Jest — not typed on globalThis.
    const devGlobal = global as unknown as { __DEV__: boolean };
    const originalDev = devGlobal.__DEV__;
    devGlobal.__DEV__ = true;

    try {
      const { getByTestId } = renderScreen(
        DeveloperOptions,
        { name: 'DeveloperOptions' },
        { state: initialState },
      );

      expect(
        getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_START_BUTTON),
      ).toBeOnTheScreen();
    } finally {
      devGlobal.__DEV__ = originalDev;
    }
  });
});
