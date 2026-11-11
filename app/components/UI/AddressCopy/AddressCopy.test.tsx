import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import AddressCopy from './AddressCopy';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import renderWithProvider from '../../../util/test/renderWithProvider';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';

const mockNavigate = jest.fn();

// Mock navigation before importing renderWithProvider
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../util/trace', () => ({
  ...jest.requireActual('../../../util/trace'),
  endTrace: jest.fn(),
  trace: jest.fn(),
}));

const renderAddressCopy = () => renderWithProvider(<AddressCopy />);

describe('AddressCopy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the copy button', () => {
    const { getByTestId } = renderAddressCopy();

    expect(
      getByTestId(WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON),
    ).toBeDefined();
  });

  it('starts the address list trace and passes an onLoad end callback when pressed', () => {
    const { getByTestId } = renderAddressCopy();

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON));

    expect(trace).toHaveBeenCalledWith({
      name: TraceName.ShowAccountAddressList,
      op: TraceOperation.AccountUi,
      tags: {
        screen: 'navbar.copy_address',
      },
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        source: 'copy_button',
        onLoad: expect.any(Function),
      }),
    );

    const navigationParams = mockNavigate.mock.calls[0][1];
    navigationParams.onLoad();

    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.ShowAccountAddressList,
    });
  });

  it('ends the address list trace if navigation throws', () => {
    const navigationError = new Error('navigation failed');
    mockNavigate.mockImplementationOnce(() => {
      throw navigationError;
    });
    const { getByTestId } = renderAddressCopy();

    expect(() =>
      fireEvent.press(getByTestId(WalletViewSelectorsIDs.ACCOUNT_COPY_BUTTON)),
    ).toThrow(navigationError);

    expect(endTrace).toHaveBeenCalledWith({
      name: TraceName.ShowAccountAddressList,
    });
  });
});
