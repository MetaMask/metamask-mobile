import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import VbaIronCustomerDevChip, {
  VbaIronCustomerDevChipSelectorsIDs,
} from './VbaIronCustomerDevChip';

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      resolveAutorampCustomerId: jest.fn(),
    },
  },
}));

const mockResolveAutorampCustomerId = Engine.context.RampsController
  .resolveAutorampCustomerId as jest.Mock<Promise<string>, []>;

describe('VbaIronCustomerDevChip', () => {
  const devGlobal = globalThis as { __DEV__?: boolean };
  let previousDev: boolean | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    previousDev = devGlobal.__DEV__;
    devGlobal.__DEV__ = true;
  });

  afterEach(() => {
    devGlobal.__DEV__ = previousDev;
  });

  it('shows the Iron customer id from the sandbox name column', async () => {
    mockResolveAutorampCustomerId.mockResolvedValue('01a0f6cabc');

    const { getByText, getByTestId } = renderWithProvider(
      <VbaIronCustomerDevChip />,
    );

    await waitFor(() => {
      expect(getByText('01a0f6cabc')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId(VbaIronCustomerDevChipSelectorsIDs.CHIP));

    expect(Clipboard.setString).toHaveBeenCalledWith('01a0f6cabc');
    expect(getByText('Copied')).toBeOnTheScreen();
  });

  it('renders nothing when the customer id cannot be resolved', async () => {
    mockResolveAutorampCustomerId.mockRejectedValue(new Error('missing'));

    const { queryByTestId } = renderWithProvider(<VbaIronCustomerDevChip />);

    await waitFor(() => {
      expect(mockResolveAutorampCustomerId).toHaveBeenCalledTimes(1);
    });
    expect(
      queryByTestId(VbaIronCustomerDevChipSelectorsIDs.CHIP),
    ).not.toBeOnTheScreen();
  });
});
