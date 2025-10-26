import { renderScreen } from '../../../../util/test/renderWithProvider';
import TokensFullView from './TokensFullView';

// Mock only external dependencies that are not under test
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => (className: string) => ({ className }),
}));

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
}));

describe('TokensFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header with title and back button', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    expect(getByTestId('header-title')).toBeOnTheScreen();
    expect(getByTestId('back-button')).toBeOnTheScreen();
  });

  it('renders token list control bar with add button', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('token-list-control-bar')).toBeOnTheScreen();
    expect(getByTestId('add-token-button')).toBeOnTheScreen();
  });

  it('renders token list component', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('token-list')).toBeOnTheScreen();
  });

  it('displays token count in token list', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('token-count')).toBeOnTheScreen();
  });

  it('shows loader when tokens are loading', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('loader')).toBeOnTheScreen();
  });
});
