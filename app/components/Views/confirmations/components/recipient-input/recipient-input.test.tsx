import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { useSendContext } from '../../context/send-context/send-context';
import { useToAddressValidation } from '../../hooks/send/useToAddressValidation';
import { useRecipientSelectionMetrics } from '../../hooks/send/metrics/useRecipientSelectionMetrics';
import { useSendActions } from '../../hooks/send/useSendActions';
import { useScanRecipientQrCode } from '../../hooks/send/useScanRecipientQrCode';
import { RecipientInput } from './recipient-input';

jest.mock('../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../hooks/send/useScanRecipientQrCode', () => ({
  useScanRecipientQrCode: jest.fn(),
}));

jest.mock('../../hooks/send/useToAddressValidation', () => ({
  useToAddressValidation: jest.fn(),
}));

jest.mock('../../hooks/send/metrics/useRecipientSelectionMetrics', () => ({
  useRecipientSelectionMetrics: jest.fn(),
}));

jest.mock('../../hooks/send/useSendActions', () => ({
  useSendActions: jest.fn(),
}));

jest.mock('../../../../../core/ClipboardManager', () => ({
  getString: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'send.to': 'To',
      'send.clear': 'Clear',
      'send.paste': 'Paste',
      'send.scan_qr_code': 'Scan QR code',
      'send.enter_address_to_send_to': 'Enter address to send to',
    };
    return mockStrings[key] || key;
  }),
}));

const noop = () => undefined;

const mockClipboardManager = jest.mocked(ClipboardManager);
const mockUseSendContext = jest.mocked(useSendContext);
const mockUseToAddressValidation = jest.mocked(useToAddressValidation);
const mockUseRecipientSelectionMetrics = jest.mocked(
  useRecipientSelectionMetrics,
);
const mockUseSendActions = jest.mocked(useSendActions);
const mockUseScanRecipientQrCode = jest.mocked(useScanRecipientQrCode);

describe('RecipientInput', () => {
  const mockUpdateTo = jest.fn();
  const mockValidateToAddress = jest.fn();
  const mockCaptureRecipientSelected = jest.fn();
  const mockHandleSubmitPress = jest.fn();
  const mockOpenScanner = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    mockUseSendContext.mockReturnValue({
      to: '',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    mockUseToAddressValidation.mockReturnValue({
      loading: false,
      resolvedAddress: undefined,
      toAddressError: undefined,
      toAddressValidated: undefined,
      toAddressWarning: undefined,
    });

    mockUseRecipientSelectionMetrics.mockReturnValue({
      captureRecipientSelected: mockCaptureRecipientSelected,
    });

    mockUseSendActions.mockReturnValue({
      handleSubmitPress: mockHandleSubmitPress,
      handleCancelPress: jest.fn(),
      handleBackPress: jest.fn(),
    });

    mockUseScanRecipientQrCode.mockReturnValue({
      openScanner: mockOpenScanner,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders with default placeholder and "To" label', () => {
    const { getByText, getByPlaceholderText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(getByText('To')).toBeOnTheScreen();
    expect(getByPlaceholderText('Enter address to send to')).toBeOnTheScreen();
  });

  it('displays paste button when input is empty', () => {
    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(getByText('Paste')).toBeOnTheScreen();
  });

  it('displays clear button when input has value and recipient is not selected from list', () => {
    mockUseSendContext.mockReturnValue({
      to: '0x123...',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(getByText('Clear')).toBeOnTheScreen();
  });

  it('displays paste button when recipient is selected from list even with value', () => {
    mockUseSendContext.mockReturnValue({
      to: '0x123...',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(getByText('Paste')).toBeOnTheScreen();
  });

  it('calls requires callbacks when text input changes', () => {
    mockUseRecipientSelectionMetrics.mockReturnValue({
      captureRecipientSelected: jest.fn(),
    });

    const mockSetIsRecipientSelectedFromList = jest.fn();
    const mockSetPastedRecipient = jest.fn();
    const { getByPlaceholderText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={mockSetIsRecipientSelectedFromList}
        setPastedRecipient={mockSetPastedRecipient}
      />,
    );

    const textInput = getByPlaceholderText('Enter address to send to');
    fireEvent.changeText(
      textInput,
      '0x1234567890123456789012345678901234567890',
    );

    expect(mockUpdateTo).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
    );
    expect(mockSetIsRecipientSelectedFromList).toHaveBeenCalled();
    expect(mockSetPastedRecipient).toHaveBeenCalledWith(undefined);
  });

  it('handles paste functionality updates input', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    mockClipboardManager.getString.mockResolvedValue(mockAddress);
    mockValidateToAddress.mockResolvedValue({ error: 'Invalid address' });
    const mockSetIsRecipientSelectedFromList = jest.fn();
    const mockSetPastedRecipient = jest.fn();

    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={mockSetIsRecipientSelectedFromList}
        setPastedRecipient={mockSetPastedRecipient}
      />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockUpdateTo).toHaveBeenCalledWith(mockAddress);
      expect(mockSetIsRecipientSelectedFromList).toHaveBeenCalled();
      expect(mockSetPastedRecipient).toHaveBeenCalledWith(mockAddress);
    });

    jest.advanceTimersByTime(100);
  });

  it('handles paste functionality with whitespace trimming', async () => {
    const mockAddress = '  0x1234567890123456789012345678901234567890  ';
    const trimmedAddress = '0x1234567890123456789012345678901234567890';
    mockClipboardManager.getString.mockResolvedValue(mockAddress);
    mockValidateToAddress.mockResolvedValue({ error: 'Invalid address' });

    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockUpdateTo).toHaveBeenCalledWith(trimmedAddress);
    });
  });

  it('handles paste functionality when clipboard is empty', async () => {
    mockClipboardManager.getString.mockResolvedValue('');

    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockClipboardManager.getString).toHaveBeenCalledTimes(1);
      expect(mockUpdateTo).not.toHaveBeenCalled();
      expect(mockValidateToAddress).not.toHaveBeenCalled();
    });
  });

  it('handles paste functionality errors gracefully', async () => {
    mockClipboardManager.getString.mockRejectedValue(
      new Error('Clipboard error'),
    );

    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockClipboardManager.getString).toHaveBeenCalledTimes(1);
      expect(mockUpdateTo).not.toHaveBeenCalled();
      expect(mockValidateToAddress).not.toHaveBeenCalled();
    });
  });

  it('clears input when clear button is pressed', () => {
    mockUseSendContext.mockReturnValue({
      to: '0x123...',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    const clearButton = getByText('Clear');
    fireEvent.press(clearButton);

    expect(mockUpdateTo).toHaveBeenCalledWith('');

    jest.advanceTimersByTime(100);
  });

  it('clears pastedRecipient when clear button is pressed', () => {
    mockUseSendContext.mockReturnValue({
      to: '0x1234567890123456789012345678901234567890',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const mockSetPastedRecipient = jest.fn();
    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={mockSetPastedRecipient}
      />,
    );

    const clearButton = getByText('Clear');
    fireEvent.press(clearButton);

    expect(mockUpdateTo).toHaveBeenCalledWith('');
    expect(mockSetPastedRecipient).toHaveBeenCalledWith(undefined);

    jest.advanceTimersByTime(100);
  });

  it('maintains correct button state based on isRecipientSelectedFromList prop', () => {
    mockUseSendContext.mockReturnValue({
      to: '0x123...',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { getByText, rerender } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(getByText('Clear')).toBeOnTheScreen();

    rerender(
      <RecipientInput
        isRecipientSelectedFromList
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );
    expect(getByText('Paste')).toBeOnTheScreen();
  });

  it('maintains correct button state transition from empty to filled input', () => {
    const { getByText, rerender } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(getByText('Paste')).toBeOnTheScreen();

    mockUseSendContext.mockReturnValue({
      to: '0x123',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    rerender(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(getByText('Clear')).toBeOnTheScreen();
  });

  it('displays the QR scan button alongside paste when input is empty', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(getByTestId('recipient-qr-scan-button')).toBeOnTheScreen();
    expect(getByText('Paste')).toBeOnTheScreen();
  });

  it('does not display the QR scan button when input has a value', () => {
    mockUseSendContext.mockReturnValue({
      to: '0x1234567890123456789012345678901234567890',
      updateTo: mockUpdateTo,
      asset: undefined,
      chainId: undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fromAccount: {} as any,
      from: '',
      maxValueMode: false,
      updateAsset: jest.fn(),
      updateValue: jest.fn(),
      value: undefined,
    });

    const { queryByTestId } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    expect(queryByTestId('recipient-qr-scan-button')).toBeNull();
  });

  it('opens the scanner when the QR scan button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
      />,
    );

    fireEvent.press(getByTestId('recipient-qr-scan-button'));

    expect(mockOpenScanner).toHaveBeenCalledTimes(1);
  });

  it('populates the input and records the QR input method on scan success', () => {
    const mockResetStateOnInput = jest.fn();
    const mockSetPastedRecipient = jest.fn();
    const mockSetAutoFilledInputMethod = jest.fn();

    renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={mockResetStateOnInput}
        setPastedRecipient={mockSetPastedRecipient}
        setAutoFilledInputMethod={mockSetAutoFilledInputMethod}
      />,
    );

    const scannedAddress = '0x1234567890123456789012345678901234567890';
    const { onAddressScanned } =
      mockUseScanRecipientQrCode.mock.calls[
        mockUseScanRecipientQrCode.mock.calls.length - 1
      ][0];
    onAddressScanned(scannedAddress);

    expect(mockResetStateOnInput).toHaveBeenCalled();
    expect(mockUpdateTo).toHaveBeenCalledWith(scannedAddress);
    expect(mockSetAutoFilledInputMethod).toHaveBeenCalledWith('qr_code_scan');
    expect(mockSetPastedRecipient).toHaveBeenCalledWith(scannedAddress);
  });

  it('records the pasted input method on paste', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    mockClipboardManager.getString.mockResolvedValue(mockAddress);
    const mockSetAutoFilledInputMethod = jest.fn();

    const { getByText } = renderWithProvider(
      <RecipientInput
        isRecipientSelectedFromList={false}
        resetStateOnInput={noop}
        setPastedRecipient={noop}
        setAutoFilledInputMethod={mockSetAutoFilledInputMethod}
      />,
    );

    fireEvent.press(getByText('Paste'));

    await waitFor(() => {
      expect(mockSetAutoFilledInputMethod).toHaveBeenCalledWith('pasted');
    });
  });
});
