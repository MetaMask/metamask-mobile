import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { Send } from './send';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {},
    },
  }),
}));

const renderComponent = () =>
  renderWithProvider(<Send />, {
    state: {
      engine: {
        backgroundState,
      },
    },
  });

describe('Send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByText } = renderComponent();

    expect(getByText('From:')).toBeTruthy();
    expect(getByText('To:')).toBeTruthy();
    expect(getByText('Amount:')).toBeTruthy();
  });

  it('navigate back when cancel is clicked', async () => {
    const { getByText } = renderComponent();

    fireEvent.press(getByText('Cancel'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('when confirm is clicked create transaction', async () => {
    const { getByText } = renderComponent();

    // actual implementation to come here when confirm is implemented
    fireEvent.press(getByText('Confirm'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('asset passed in nav params should be used if present', async () => {
    (useRoute as jest.MockedFn<typeof useRoute>).mockReturnValue({
      params: {
        asset: {
          name: 'Ethereum',
        },
      },
    } as RouteProp<ParamListBase, string>);
    const { getByText } = renderComponent();
    expect(getByText('Asset: Ethereum')).toBeTruthy();
  });
});
