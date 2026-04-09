import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RpcUrlInput from './RpcUrlInput';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';

describe('RpcUrlInput', () => {
  const defaultProps = {
    checkIfNetworkExists: jest.fn().mockResolvedValue([]),
    checkIfRpcUrlExists: jest.fn().mockResolvedValue([]),
    onValidationSuccess: jest.fn(),
    onValidationChange: jest.fn(),
    testID: 'rpc-url-input',
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders the text input', () => {
    const { getByTestId } = render(<RpcUrlInput {...defaultProps} />);
    expect(getByTestId('rpc-url-input')).toBeOnTheScreen();
  });

  it('does not show warning initially', () => {
    const { queryByTestId } = render(<RpcUrlInput {...defaultProps} />);
    expect(
      queryByTestId(NetworkDetailsViewSelectorsIDs.RPC_WARNING_BANNER),
    ).toBeNull();
  });

  it('shows warning for invalid URL', async () => {
    const { getByTestId } = render(<RpcUrlInput {...defaultProps} />);

    fireEvent.changeText(getByTestId('rpc-url-input'), 'not-a-url');

    await waitFor(() => {
      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.RPC_WARNING_BANNER),
      ).toBeOnTheScreen();
    });
    expect(defaultProps.onValidationChange).toHaveBeenCalledWith(false);
  });

  it('shows prefix warning for URL missing https prefix', async () => {
    const { getByTestId } = render(<RpcUrlInput {...defaultProps} />);

    fireEvent.changeText(getByTestId('rpc-url-input'), 'rpc.example.com');

    await waitFor(() => {
      expect(
        getByTestId(NetworkDetailsViewSelectorsIDs.RPC_WARNING_BANNER),
      ).toBeOnTheScreen();
    });
    expect(defaultProps.onValidationChange).toHaveBeenCalledWith(false);
  });

  it('shows warning when RPC URL already exists', async () => {
    const props = {
      ...defaultProps,
      checkIfRpcUrlExists: jest.fn().mockResolvedValue([{ chainId: '0x1' }]),
    };

    const { getByTestId } = render(<RpcUrlInput {...props} />);
    fireEvent.changeText(
      getByTestId('rpc-url-input'),
      'https://rpc.example.com',
    );

    await waitFor(() => {
      expect(props.onValidationChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows warning when network exists for the URL', async () => {
    const props = {
      ...defaultProps,
      checkIfNetworkExists: jest.fn().mockResolvedValue([{ chainId: '0x89' }]),
    };

    const { getByTestId } = render(<RpcUrlInput {...props} />);
    fireEvent.changeText(
      getByTestId('rpc-url-input'),
      'https://polygon-rpc.com',
    );

    await waitFor(() => {
      expect(props.onValidationChange).toHaveBeenCalledWith(false);
    });
  });

  it('calls onValidationSuccess for valid HTTPS URL', async () => {
    const { getByTestId } = render(<RpcUrlInput {...defaultProps} />);

    fireEvent.changeText(
      getByTestId('rpc-url-input'),
      'https://rpc.example.com',
    );

    await waitFor(() => {
      expect(defaultProps.onValidationSuccess).toHaveBeenCalled();
    });
    expect(defaultProps.onValidationChange).toHaveBeenCalledWith(true);
  });

  it('calls parent onChangeText when provided', async () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <RpcUrlInput {...defaultProps} onChangeText={onChangeText} />,
    );

    fireEvent.changeText(
      getByTestId('rpc-url-input'),
      'https://rpc.example.com',
    );

    expect(onChangeText).toHaveBeenCalledWith('https://rpc.example.com');
  });
});
