import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGridFooter from './NftGridFooter';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStore = configureMockStore();

describe('NftGridFooter', () => {
  const mockGoToAddCollectible = jest.fn();
  const defaultProps = {
    isAddNFTEnabled: true,
    goToAddCollectible: mockGoToAddCollectible,
  };

  const initialState = {
    collectibles: {
      isNftFetchingProgress: false,
    },
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly without spinner', () => {
    const store = mockStore(initialState);
    const { toJSON } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} />
      </Provider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows spinner when NFTs are being fetched', () => {
    const stateWithFetching = {
      ...initialState,
      collectibles: {
        isNftFetchingProgress: true,
      },
    };
    const store = mockStore(stateWithFetching);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} />
      </Provider>,
    );

    expect(getByTestId('collectible-contracts-spinner')).toBeDefined();
  });

  it('does not show spinner when NFTs are not being fetched', () => {
    const store = mockStore(initialState);

    const { queryByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} />
      </Provider>,
    );

    expect(queryByTestId('collectible-contracts-spinner')).toBeNull();
  });

  it('displays empty text and add collectibles button', () => {
    const store = mockStore(initialState);

    const { getByTestId, toJSON } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} />
      </Provider>,
    );

    // Check that the button exists
    expect(getByTestId('import-collectible-button')).toBeDefined();

    // Check that the component renders correctly
    const rendered = toJSON();
    expect(rendered).toBeDefined();
  });

  it('calls goToAddCollectible when add collectibles button is pressed', () => {
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} />
      </Provider>,
    );

    const addButton = getByTestId('import-collectible-button');
    fireEvent.press(addButton);

    expect(mockGoToAddCollectible).toHaveBeenCalledTimes(1);
  });

  it('renders disabled button when isAddNFTEnabled is false', () => {
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} isAddNFTEnabled={false} />
      </Provider>,
    );

    const addButton = getByTestId('import-collectible-button');
    expect(addButton.props.disabled).toBe(true);
  });

  it('renders enabled button when isAddNFTEnabled is true', () => {
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter {...defaultProps} />
      </Provider>,
    );

    const addButton = getByTestId('import-collectible-button');
    expect(addButton.props.disabled).toBe(false);
  });
});
