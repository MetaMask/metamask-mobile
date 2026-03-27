import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RpcFormFields from './RpcFormFields';
import { NetworkDetailsViewSelectorsIDs } from '../NetworkDetailsView.testIds';
import createStyles from '../NetworkDetailsView.styles';
import { mockTheme } from '../../../../../util/theme';

const styles = createStyles({ theme: mockTheme });

const defaultProps = {
  inputRpcURL: { current: null },
  inputNameRpcURL: { current: null },
  rpcUrlForm: '',
  rpcNameForm: '',
  isRpcUrlFieldFocused: false,
  warningRpcUrl: undefined as string | undefined,
  onRpcUrlAdd: jest.fn(),
  onRpcNameAdd: jest.fn(),
  onRpcUrlFocused: jest.fn(),
  onRpcUrlBlur: jest.fn(),
  jumpToChainId: jest.fn(),
  checkIfNetworkExists: jest.fn().mockResolvedValue([]),
  checkIfRpcUrlExists: jest.fn().mockResolvedValue([]),
  onValidationSuccess: jest.fn(),
  onRpcUrlValidationChange: jest.fn(),
  styles,
  themeAppearance: 'light' as const,
  placeholderTextColor: mockTheme.colors.text.muted,
};

describe('RpcFormFields', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders both RPC URL and RPC name inputs', () => {
    const { getByTestId } = render(<RpcFormFields {...defaultProps} />);

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_NAME_INPUT),
    ).toBeOnTheScreen();
  });

  it('applies base input style when not focused and no warning', () => {
    const { getByTestId } = render(<RpcFormFields {...defaultProps} />);

    const input = getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT);
    const flatStyle = Array.isArray(input.props.style)
      ? Object.assign({}, ...input.props.style.filter(Boolean))
      : input.props.style;

    expect(flatStyle.borderColor).toBe(mockTheme.colors.border.muted);
  });

  it('applies focus style when isRpcUrlFieldFocused is true', () => {
    const { getByTestId } = render(
      <RpcFormFields {...defaultProps} isRpcUrlFieldFocused />,
    );

    const input = getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT);
    const flatStyle = Array.isArray(input.props.style)
      ? Object.assign({}, ...input.props.style.filter(Boolean))
      : input.props.style;

    expect(flatStyle.borderColor).toBe(mockTheme.colors.border.default);
  });

  it('applies error style when not focused and warningRpcUrl is set', () => {
    const { getByTestId } = render(
      <RpcFormFields
        {...defaultProps}
        isRpcUrlFieldFocused={false}
        warningRpcUrl="Invalid URL"
      />,
    );

    const input = getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT);
    const flatStyle = Array.isArray(input.props.style)
      ? Object.assign({}, ...input.props.style.filter(Boolean))
      : input.props.style;

    expect(flatStyle.borderColor).toBe(mockTheme.colors.error.default);
  });

  it('focus style takes precedence over error style', () => {
    const { getByTestId } = render(
      <RpcFormFields
        {...defaultProps}
        isRpcUrlFieldFocused
        warningRpcUrl="Invalid URL"
      />,
    );

    const input = getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT);
    const flatStyle = Array.isArray(input.props.style)
      ? Object.assign({}, ...input.props.style.filter(Boolean))
      : input.props.style;

    expect(flatStyle.borderColor).toBe(mockTheme.colors.border.default);
  });

  it('calls onRpcUrlFocused on focus and onRpcUrlBlur on blur', () => {
    const { getByTestId } = render(<RpcFormFields {...defaultProps} />);

    const input = getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT);
    fireEvent(input, 'focus');
    expect(defaultProps.onRpcUrlFocused).toHaveBeenCalled();

    fireEvent(input, 'blur');
    expect(defaultProps.onRpcUrlBlur).toHaveBeenCalled();
  });

  it('calls onRpcNameAdd when RPC name text changes', () => {
    const { getByTestId } = render(<RpcFormFields {...defaultProps} />);

    fireEvent.changeText(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_NAME_INPUT),
      'My RPC',
    );
    expect(defaultProps.onRpcNameAdd).toHaveBeenCalledWith('My RPC');
  });

  it('displays pre-filled values', () => {
    const { getByTestId } = render(
      <RpcFormFields
        {...defaultProps}
        rpcUrlForm="https://rpc.example.com"
        rpcNameForm="Example RPC"
      />,
    );

    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_URL_INPUT).props.value,
    ).toBe('https://rpc.example.com');
    expect(
      getByTestId(NetworkDetailsViewSelectorsIDs.RPC_NAME_INPUT).props.value,
    ).toBe('Example RPC');
  });
});
