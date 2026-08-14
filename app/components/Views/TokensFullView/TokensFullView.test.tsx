import { renderScreen } from '../../../util/test/renderWithProvider';
import TokensFullView from './TokensFullView';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';

// Mock external dependencies that are not under test
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = () => ({});
    return tw;
  },
}));

// Mock AssetPollingProvider to avoid Engine/controller polling setup
jest.mock('../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: () => null,
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenSortConfig: jest.fn(),
    },
  },
}));

// Mock Tokens component to avoid complex Redux state setup
jest.mock('../../UI/Tokens', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return function MockTokens({
    isFullView: _isFullView,
  }: {
    isFullView?: boolean;
  }) {
    return React.createElement(
      View,
      { testID: 'tokens-component' },
      'Tokens Component',
    );
  };
});

describe('TokensFullView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tokens content', () => {
    const { getByTestId } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    expect(getByTestId('tokens-component')).toBeOnTheScreen();
  });

  it('resets token sort config on unmount', () => {
    const { unmount } = renderScreen(TokensFullView, {
      name: 'TokensFullView',
    });

    unmount();

    expect(
      Engine.context.PreferencesController.setTokenSortConfig,
    ).toHaveBeenCalledWith(DEFAULT_TOKEN_SORT_CONFIG);
  });
});
