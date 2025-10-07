import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGridFooter from './NftGridFooter';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();

// Mock i18n strings
jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const strings: Record<string, string> = {
      'wallet.no_collectibles': 'No NFTs yet',
      'wallet.add_collectibles': 'Import NFTs',
    };
    return strings[key] || key;
  },
}));

// Mock theme hook
jest.mock('../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { alternative: '#666666' },
      primary: { default: '#037DD6' },
    },
  }),
}));

// Mock TextComponent from design system
jest.mock('../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return ({
    children,
    style,
    ...props
  }: {
    children: React.ReactNode;
    style?: unknown;
    [key: string]: unknown;
  }) => (
    <Text style={style} {...props}>
      {children}
    </Text>
  );
});

describe('NftGridFooter', () => {
  const mockGoToAddCollectible = jest.fn();

  const defaultProps = {
    isAddNFTEnabled: true,
    goToAddCollectible: mockGoToAddCollectible,
  };

  const createInitialState = () => ({
    engine: {
      backgroundState,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders footer with correct content', () => {
    const store = mockStore(createInitialState());
    const { getByText, getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} />
      </Provider>,
    );

    expect(getByText('No NFTs yet')).toBeDefined();
    expect(getByText('Import NFTs')).toBeDefined();
    expect(getByTestId('import-collectible-button')).toBeDefined();
  });

  it('calls goToAddCollectible when import button is pressed', () => {
    const store = mockStore(createInitialState());
    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} />
      </Provider>,
    );

    fireEvent.press(getByTestId('import-collectible-button'));
    expect(mockGoToAddCollectible).toHaveBeenCalledTimes(1);
  });

  it('disables import button when isAddNFTEnabled is false', () => {
    const store = mockStore(createInitialState());
    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} isAddNFTEnabled={false} />
      </Provider>,
    );

    const importButton = getByTestId('import-collectible-button');
    expect(importButton.props.disabled).toBe(true);
  });

  it('enables import button when isAddNFTEnabled is true', () => {
    const store = mockStore(createInitialState());
    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} isAddNFTEnabled />
      </Provider>,
    );

    const importButton = getByTestId('import-collectible-button');
    expect(importButton.props.disabled).toBe(false);
  });
});
