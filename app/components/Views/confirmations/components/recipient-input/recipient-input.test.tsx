import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ClipboardManager from '../../../../../core/ClipboardManager';
import { useSendContext } from '../../context/send-context/send-context';
import { useToAddressValidation } from '../../hooks/send/useToAddressValidation';
import { useRecipientSelectionMetrics } from '../../hooks/send/metrics/useRecipientSelectionMetrics';
import { useSendActions } from '../../hooks/send/useSendActions';
import { RecipientInput } from './recipient-input';

jest.mock('../../context/send-context/send-context', () => ({
  useSendContext: jest.fn(),
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
      'send.enter_address_to_send_to': 'Enter address to send to',
    };
    return mockStrings[key] || key;
  }),
}));

const mockClipboardManager = jest.mocked(ClipboardManager);
const mockUseSendContext = jest.mocked(useSendContext);
const mockUseToAddressValidation = jest.mocked(useToAddressValidation);
const mockUseRecipientSelectionMetrics = jest.mocked(
  useRecipientSelectionMetrics,
);
const mockUseSendActions = jest.mocked(useSendActions);

describe('RecipientInput', () => {
  const mockUpdateTo = jest.fn();
  const mockValidateToAddress = jest.fn();
  const mockSetRecipientInputMethodPasted = jest.fn();
  const mockCaptureRecipientSelected = jest.fn();
  const mockHandleSubmitPress = jest.fn();

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
      toAddressError: undefined,
      toAddressWarning: undefined,
      validateToAddress: mockValidateToAddress,
    });

    mockUseRecipientSelectionMetrics.mockReturnValue({
      captureRecipientSelected: mockCaptureRecipientSelected,
      setRecipientInputMethodManual: jest.fn(),
      setRecipientInputMethodPasted: mockSetRecipientInputMethodPasted,
      setRecipientInputMethodSelectAccount: jest.fn(),
      setRecipientInputMethodSelectContact: jest.fn(),
    });

    mockUseSendActions.mockReturnValue({
      handleSubmitPress: mockHandleSubmitPress,
      handleCancelPress: jest.fn(),
      handleBackPress: jest.fn(),
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders with default placeholder and "To" label', () => {
    const { getByText, getByPlaceholderText } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList={false} />,
    );

    expect(getByText('To')).toBeOnTheScreen();
    expect(getByPlaceholderText('Enter address to send to')).toBeOnTheScreen();
  });

  it('displays paste button when input is empty', () => {
    const { getByText } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList={false} />,
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
      <RecipientInput isRecipientSelectedFromList={false} />,
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
      <RecipientInput isRecipientSelectedFromList />,
    );

    expect(getByText('Paste')).toBeOnTheScreen();
  });

  it('shows empty input when recipient is selected from list', () => {
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

    const { getByDisplayValue } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList />,
    );

    expect(() => getByDisplayValue('0x123...')).toThrow();
  });

  it('calls updateTo when text input changes', () => {
    const { getByPlaceholderText } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList={false} />,
    );

    const textInput = getByPlaceholderText('Enter address to send to');
    fireEvent.changeText(
      textInput,
      '0x1234567890123456789012345678901234567890',
    );

    expect(mockUpdateTo).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
    );
  });

  it('handles paste functionality with valid address and auto-submits', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    mockClipboardManager.getString.mockResolvedValue(mockAddress);
    mockValidateToAddress.mockResolvedValue({ error: undefined });

    const { getByText } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList={false} />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockClipboardManager.getString).toHaveBeenCalledTimes(1);
      expect(mockValidateToAddress).toHaveBeenCalledWith(mockAddress);
      expect(mockSetRecipientInputMethodPasted).toHaveBeenCalledTimes(1);
      expect(mockCaptureRecipientSelected).toHaveBeenCalledTimes(1);
      expect(mockHandleSubmitPress).toHaveBeenCalledWith(mockAddress);
    });
  });

  it('handles paste functionality with invalid address and updates input', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    mockClipboardManager.getString.mockResolvedValue(mockAddress);
    mockValidateToAddress.mockResolvedValue({ error: 'Invalid address' });

    const { getByText } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList={false} />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockValidateToAddress).toHaveBeenCalledWith(mockAddress);
      expect(mockUpdateTo).toHaveBeenCalledWith(mockAddress);
      expect(mockHandleSubmitPress).not.toHaveBeenCalled();
    });

    jest.advanceTimersByTime(100);
  });

  it('handles paste functionality with whitespace trimming', async () => {
    const mockAddress = '  0x1234567890123456789012345678901234567890  ';
    const trimmedAddress = '0x1234567890123456789012345678901234567890';
    mockClipboardManager.getString.mockResolvedValue(mockAddress);
    mockValidateToAddress.mockResolvedValue({ error: 'Invalid address' });

    const { getByText } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList={false} />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockValidateToAddress).toHaveBeenCalledWith(trimmedAddress);
      expect(mockUpdateTo).toHaveBeenCalledWith(trimmedAddress);
    });
  });

  it('handles paste functionality when clipboard is empty', async () => {
    mockClipboardManager.getString.mockResolvedValue('');

    const { getByText } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList={false} />,
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
      <RecipientInput isRecipientSelectedFromList={false} />,
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
      <RecipientInput isRecipientSelectedFromList={false} />,
    );

    const clearButton = getByText('Clear');
    fireEvent.press(clearButton);

    expect(mockUpdateTo).toHaveBeenCalledWith('');

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
      <RecipientInput isRecipientSelectedFromList={false} />,
    );

    expect(getByText('Clear')).toBeOnTheScreen();

    rerender(<RecipientInput isRecipientSelectedFromList />);
    expect(getByText('Paste')).toBeOnTheScreen();
  });

  it('maintains correct button state transition from empty to filled input', () => {
    const { getByText, rerender } = renderWithProvider(
      <RecipientInput isRecipientSelectedFromList={false} />,
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

    rerender(<RecipientInput isRecipientSelectedFromList={false} />);

    expect(getByText('Clear')).toBeOnTheScreen();
  });
});
