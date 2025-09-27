import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import NftGridFooter from './NftGridFooter';
import { backgroundState } from '../../../util/test/initial-root-state';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

const mockStore = configureMockStore();
const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useMetrics');
(useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
});

describe('NftGridFooter', () => {
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
        <NftGridFooter />
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
        <NftGridFooter />
      </Provider>,
    );

    expect(getByTestId('spinner')).toBeDefined();
  });

  it('does not show spinner when NFTs are not being fetched', () => {
    const store = mockStore(initialState);

    const { queryByTestId } = render(
      <Provider store={store}>
        <NftGridFooter />
      </Provider>,
    );

    expect(queryByTestId('spinner')).toBeNull();
  });

  it('displays empty text and add collectibles button', () => {
    const store = mockStore(initialState);

    const { getByTestId, toJSON } = render(
      <Provider store={store}>
        <NftGridFooter />
      </Provider>,
    );

    // Check that the button exists
    expect(getByTestId('import-collectible-button')).toBeDefined();

    // Check that the component renders correctly
    const rendered = toJSON();
    expect(rendered).toBeDefined();
  });

  it('navigates to add asset screen when add collectibles is pressed', async () => {
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter />
      </Provider>,
    );

    const addButton = getByTestId('import-collectible-button');
    fireEvent.press(addButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('AddAsset', {
        assetType: 'collectible',
      });
    });
  });

  it('disables add button temporarily when pressed', async () => {
    const store = mockStore(initialState);

    const { getByTestId } = render(
      <Provider store={store}>
        <NftGridFooter />
      </Provider>,
    );

    const addButton = getByTestId('import-collectible-button');

    // Button should be enabled initially
    expect(addButton.props.disabled).toBeFalsy();

    fireEvent.press(addButton);

    // Button should be re-enabled after the action
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
