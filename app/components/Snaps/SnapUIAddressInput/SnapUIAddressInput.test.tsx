import React from 'react';
import { render } from '@testing-library/react-native';
import { SnapUIAddressInput } from './SnapUIAddressInput';
import { useSnapInterfaceContext } from '../SnapInterfaceContext';
import { useDisplayName } from '../SnapUIAddress/useDisplayName';
import { INPUT_TEST_ID } from '../../../component-library/components/Form/TextField/foundation/Input/Input.constants';

jest.mock('../SnapInterfaceContext');
jest.mock('../SnapUIAddress/useDisplayName');
jest.mock('react-redux', () => ({
  useSelector: jest.fn().mockImplementation((selector) =>
    // Mock settings to use Jazzicon for consistent testing
    selector({ settings: { useBlockieIcon: false } })
  ),
}));

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

    expect(getByTestId(INPUT_TEST_ID)).toBeTruthy();
  });

  it('supports existing state', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);

    const { getByDisplayValue } = render(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} />,
    );

    expect(getByDisplayValue(testAddress)).toBeTruthy();
  });

  it('supports a placeholder', () => {
    const placeholder = 'Enter ETH address';
    const { getByTestId } = render(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        placeholder={placeholder}
      />,
    );

    const textfield = getByTestId(INPUT_TEST_ID);
    expect(textfield.props.placeholder).toBe(placeholder);
  });

  it('supports the disabled prop', () => {
    const { getByTestId } = render(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        disabled
      />,
    );

    const textfield = getByTestId(INPUT_TEST_ID);
    expect(textfield.props.editable).toBe(false);
  });

  it('will render within a field', () => {
    const label = 'Address Field';
    const { getByText } = render(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        label={label}
      />,
    );

    expect(getByText(label)).toBeTruthy();
  });

  it('will render a matched address name', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { getByText } = render(
      <SnapUIAddressInput name="testAddress" chainId={testChainId} />,
    );

    expect(getByText(displayName)).toBeTruthy();
    expect(getByText(testAddress)).toBeTruthy();
  });

  it('will render avatar when displayAvatar is true', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { toJSON } = render(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        displayAvatar
      />,
    );


    const tree = JSON.stringify(toJSON());
    expect(tree.includes('RNSVGSvgView')).toBe(true);
  });

  it('will not render avatar when displayAvatar is false', () => {
    mockGetValue.mockReturnValue(`${testChainId}:${testAddress}`);
    const displayName = 'Vitalik.eth';
    (useDisplayName as jest.Mock).mockReturnValue(displayName);

    const { toJSON } = render(
      <SnapUIAddressInput
        name="testAddress"
        chainId={testChainId}
        displayAvatar={false}
      />,
    );

    const tree = JSON.stringify(toJSON());
    expect(tree.includes('RNSVGSvgView')).toBe(false);
  });
});
