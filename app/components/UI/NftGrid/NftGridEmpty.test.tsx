import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGridEmpty from './NftGridEmpty';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();

describe('NftGridEmpty', () => {
  const mockGoToAddCollectible = jest.fn();
  const defaultProps = {
    isAddNFTEnabled: true,
    goToAddCollectible: mockGoToAddCollectible,
  };

  const initialState = {
    user: {
      appTheme: 'os',
    },
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const store = mockStore(initialState);
    const { toJSON } = render(
      <Provider store={store}>
        <NftGridEmpty {...defaultProps} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with disabled add NFT button when isAddNFTEnabled is false', () => {
    const store = mockStore(initialState);
    const { toJSON } = render(
      <Provider store={store}>
        <NftGridEmpty {...defaultProps} isAddNFTEnabled={false} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls goToAddCollectible when discover button is pressed', () => {
    const store = mockStore(initialState);
    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridEmpty {...defaultProps} />
      </Provider>,
    );

    const discoverButton = getByTestId('import-collectible-button');
    fireEvent.press(discoverButton);

    expect(mockGoToAddCollectible).toHaveBeenCalledTimes(1);
  });

  it('renders disabled button when isAddNFTEnabled is false', () => {
    const store = mockStore(initialState);
    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridEmpty {...defaultProps} isAddNFTEnabled={false} />
      </Provider>,
    );

    const discoverButton = getByTestId('import-collectible-button');
    expect(discoverButton.props.accessibilityState.disabled).toBe(true);
  });

  it('renders enabled button when isAddNFTEnabled is true', () => {
    const store = mockStore(initialState);
    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridEmpty {...defaultProps} />
      </Provider>,
    );

    const discoverButton = getByTestId('import-collectible-button');
    expect(discoverButton.props.accessibilityState.disabled).toBe(false);
  });
});
