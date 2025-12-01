import React from 'react';
import { render, userEvent, waitFor } from '@testing-library/react-native';
import RpcUrlInput from './RpcUrlInput';
import { strings } from '../../../../../../locales/i18n';

describe('RpcUrlInput', () => {
  const mockCheckIfNetworkExists = jest.fn();
  const mockCheckIfRpcUrlExists = jest.fn();
  const mockOnValidationChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not show an error when a valid RPC URL is pasted', async () => {
    mockCheckIfNetworkExists.mockResolvedValue([]);
    mockCheckIfRpcUrlExists.mockResolvedValue([]);

    const { getByTestId, queryByText } = render(
      <RpcUrlInput
        testID="rpc-url-input"
        value=""
        onChangeText={jest.fn()}
        checkIfNetworkExists={mockCheckIfNetworkExists}
        checkIfRpcUrlExists={mockCheckIfRpcUrlExists}
        onValidationChange={mockOnValidationChange}
      />,
    );

    const input = getByTestId('rpc-url-input');
    const validRpcUrl = 'https://mainnet.infura.io/v3/123';

    // Simulate user pasting the URL
    await userEvent.paste(input, validRpcUrl);

    // Check that the error message is not present
    await waitFor(() =>
      expect(
        queryByText(strings('app_settings.invalid_rpc_url')),
      ).not.toBeOnTheScreen(),
    );
  });

  it.each([
    {
      description: 'is invalid',
      rpcUrl: 'invalid-url',
      errorMessage: strings('app_settings.invalid_rpc_prefix'),
      existingNetworks: [],
      existingRPCs: [],
    },
    {
      description: 'already exists',
      rpcUrl: 'https://mainnet.infura.io/v3/123',
      errorMessage: strings('app_settings.url_associated_to_another_chain_id'),
      existingNetworks: [{ network: 'mainnet' }],
      existingRPCs: [],
    },
    {
      description: 'is a duplicate',
      rpcUrl: 'https://mainnet.infura.io/v3/123',
      errorMessage: strings('app_settings.invalid_rpc_url'),
      existingNetworks: [],
      existingRPCs: [{ network: 'mainnet' }],
    },
  ])(
    'shows an error when the RPC URL $description',
    async ({ rpcUrl, errorMessage, existingNetworks, existingRPCs }) => {
      mockCheckIfNetworkExists.mockResolvedValue(existingNetworks);
      mockCheckIfRpcUrlExists.mockResolvedValue(existingRPCs);

      const { getByTestId, findByText } = render(
        <RpcUrlInput
          testID="rpc-url-input"
          value=""
          onChangeText={jest.fn()}
          checkIfNetworkExists={mockCheckIfNetworkExists}
          checkIfRpcUrlExists={mockCheckIfRpcUrlExists}
          onValidationChange={mockOnValidationChange}
        />,
      );

      const input = getByTestId('rpc-url-input');

      // Simulate user pasting the URL
      await userEvent.paste(input, rpcUrl);

      // Check that the error message is present
      expect(await findByText(errorMessage)).toBeOnTheScreen();
    },
  );
});
