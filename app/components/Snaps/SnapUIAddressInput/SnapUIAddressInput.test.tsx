import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SnapUIAddressInput } from './SnapUIAddressInput';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { useDisplayName } from '../SnapUIAddress/useDisplayName';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { AvatarAccountType } from '../../../component-library/components/Avatars/Avatar';
import { SNAP_UI_AVATAR_TEST_ID } from '../SnapUIAvatar/SnapUIAvatar';

const mockInitialState = {
  settings: {
    avatarAccountType: AvatarAccountType.Maskicon,
  },
};

jest.mock('../SnapInterfaceContext');
jest.mock('../SnapUIAddress/useDisplayName');

describe('SnapUIAddressInput', () => {
  const mockHandleInputChange = jest.fn();
  const mockSetCurrentFocusedInput = jest.fn();
  const mockGetValue = jest.fn();

  // Define a valid Ethereum chain ID for testing
  const testChainId = `eip155:0`;
  const testAddress = '0xabcd5d886577d5081b0c52e242ef29e70be3e7bc';

  beforeEach(() => {
    (useSnapInterfaceContext as jest.Mock).mockReturnValue({
      handleInputChange: mockHandleInputChange,
      getValue: mockGetValue,
      setCurrentFocusedInput: mockSetCurrentFocusedInput,
      focusedInput: null,
    });

    (useDisplayName as jest.Mock).mockReturnValue(undefined);

    jest.clearAllMocks();
  });

  it('will render', () => {
    const { getByTestId } = render(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} />,
    );

    expect(getByTestId('testAddress-snap-address-input')).toBeTruthy();
  });

  it('supports existing state', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);

    const { getByDisplayValue } = renderWithProvider(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} />,
      { state: mockInitialState },
    );

    expect(getByDisplayValue(testAddress)).toBeTruthy();
  });

  it('can accept input', () => {
    const { getByTestId } = renderWithProvider(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} />,
      { state: mockInitialState },
    );

    const textfield = getByTestId('testAddress-snap-address-input');
    fireEvent.changeText(textfield, '0x');
    expect(mockHandleInputChange).toHaveBeenCalledWith(
      'testAddress',
      `${testChainId}:0x`,
      undefined,
    );
  });

  it('supports a placeholder', () => {
    const placeholder = 'Enter ETH address';
    const { getByTestId } = renderWithProvider(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        placeholder={placeholder}
      />,
      { state: mockInitialState },
    );

    const textfield = getByTestId('testAddress-snap-address-input');
    expect(textfield.props.placeholder).toBe(placeholder);
  });

  it('supports the disabled prop', () => {
    const { getByTestId } = renderWithProvider(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} disabled />,
      { state: mockInitialState },
    );

    const textfield = getByTestId('testAddress-snap-address-input');
    expect(textfield.props.editable).toBe(false);
  });

  it('will render within a field', () => {
    const label = 'Address Field';
    const { getByText } = renderWithProvider(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        label={label}
      />,
      { state: mockInitialState },
    );

    expect(getByText(label)).toBeTruthy();
  });

  it('will render a matched address name', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { getByText } = renderWithProvider(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} />,
      { state: mockInitialState },
    );

    expect(getByText(displayName)).toBeTruthy();
    expect(getByText(testAddress)).toBeTruthy();
  });

  it('will render avatar when displayAvatar is true', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { getByTestId } = renderWithProvider(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        displayAvatar
      />,
      { state: mockInitialState },
    );

    expect(getByTestId(SNAP_UI_AVATAR_TEST_ID)).toBeTruthy();
  });

  it('will not render avatar when displayAvatar is false', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { toJSON } = renderWithProvider(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        displayAvatar={false}
      />,
      { state: mockInitialState },
    );

    const tree = JSON.stringify(toJSON());
    expect(tree.includes('RNSVGSvgView')).toBe(false);
  });

  it('renders with an invalid CAIP Account ID', () => {
    mockGetValue.mockReturnValue('eip155:0:https://foobar.baz/foobar');

    const { toJSON } = renderWithProvider(
      <SnapUIAddressInput
        name="input"
        chainId="eip155:0"
        displayAvatar={false}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the matched address info in a disabled state', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { getByText, toJSON, getByTestId } = renderWithProvider(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} disabled />,
      { state: mockInitialState },
    );

    expect(getByText(displayName)).toBeTruthy();
    expect(getByText(testAddress)).toBeTruthy();
    const closeButton = getByTestId('snap-ui-address-input__clear-button');
    expect(closeButton).toBeTruthy();

    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('"opacity":0.5');
    expect(tree).toContain('"disabled":true');
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders the matched address info with an error', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { queryByText, getByText, getByTestId } = renderWithProvider(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        error="Error"
      />,
      { state: mockInitialState },
    );

    expect(queryByText(displayName)).toBeTruthy();
    expect(getByText('Error')).toBeTruthy();
    expect(getByTestId(SNAP_UI_AVATAR_TEST_ID)).toBeTruthy();
  });

  it('disables clear button for the input when disabled', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);

    const { getByTestId, toJSON } = renderWithProvider(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} disabled />,
    );

    const input = getByTestId('testAddress-snap-address-input');
    expect(input.props.editable).toBe(false);
    expect(input.props.value).toBe(testAddress);

    const closeButton = getByTestId('snap-ui-address-input__clear-button');
    expect(closeButton).toBeTruthy();

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('"disabled":true');
  });

  it('disables clear button for the matched address info when disabled', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { getByText, getByTestId, toJSON } = renderWithProvider(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} disabled />,
      { state: mockInitialState },
    );

    expect(getByText(displayName)).toBeTruthy();
    expect(getByText(testAddress)).toBeTruthy();

    const closeButton = getByTestId('snap-ui-address-input__clear-button');
    expect(closeButton).toBeTruthy();

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('"disabled":true');
  });
});
