import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { RecipientInput } from './recipient-input';
import ClipboardManager from '../../../../../core/ClipboardManager';

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

describe('RecipientInput', () => {
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders with default placeholder and "To" label', () => {
    const { getByText, getByPlaceholderText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} />,
    );

    expect(getByText('To')).toBeOnTheScreen();
    expect(getByPlaceholderText('Enter address to send to')).toBeOnTheScreen();
  });

  it('displays paste button when input is empty', () => {
    const { getByText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} />,
    );

    expect(getByText('Paste')).toBeOnTheScreen();
  });

  it('displays clear button when input has value', () => {
    const { getByText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} value="0x123..." />,
    );

    expect(getByText('Clear')).toBeOnTheScreen();
  });

  it('calls onChangeText when text input changes', () => {
    const { getByPlaceholderText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} />,
    );

    const textInput = getByPlaceholderText('Enter address to send to');
    fireEvent.changeText(
      textInput,
      '0x1234567890123456789012345678901234567890',
    );

    expect(mockOnChangeText).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
    );
  });

  it('handles paste functionality successfully', async () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    mockClipboardManager.getString.mockResolvedValue(mockAddress);

    const { getByText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockClipboardManager.getString).toHaveBeenCalledTimes(1);
      expect(mockOnChangeText).toHaveBeenCalledWith(mockAddress);
    });

    jest.advanceTimersByTime(100);
  });

  it('handles paste functionality with whitespace trimming', async () => {
    const mockAddress = '  0x1234567890123456789012345678901234567890  ';
    const trimmedAddress = '0x1234567890123456789012345678901234567890';
    mockClipboardManager.getString.mockResolvedValue(mockAddress);

    const { getByText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockOnChangeText).toHaveBeenCalledWith(trimmedAddress);
    });
  });

  it('handles paste functionality when clipboard is empty', async () => {
    mockClipboardManager.getString.mockResolvedValue('');

    const { getByText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockClipboardManager.getString).toHaveBeenCalledTimes(1);
      expect(mockOnChangeText).not.toHaveBeenCalled();
    });
  });

  it('handles paste functionality errors gracefully', async () => {
    mockClipboardManager.getString.mockRejectedValue(
      new Error('Clipboard error'),
    );

    const { getByText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} />,
    );

    const pasteButton = getByText('Paste');
    fireEvent.press(pasteButton);

    await waitFor(() => {
      expect(mockClipboardManager.getString).toHaveBeenCalledTimes(1);
      expect(mockOnChangeText).not.toHaveBeenCalled();
    });
  });

  it('clears input when clear button is pressed', () => {
    const { getByText } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} value="0x123..." />,
    );

    const clearButton = getByText('Clear');
    fireEvent.press(clearButton);

    expect(mockOnChangeText).toHaveBeenCalledWith('');

    jest.advanceTimersByTime(100);
  });

  it('maintains correct button state transition', () => {
    const { getByText, rerender } = renderWithProvider(
      <RecipientInput onChangeText={mockOnChangeText} value="" />,
    );

    expect(getByText('Paste')).toBeOnTheScreen();

    rerender(<RecipientInput onChangeText={mockOnChangeText} value="0x123" />);

    expect(getByText('Clear')).toBeOnTheScreen();

    rerender(<RecipientInput onChangeText={mockOnChangeText} value="" />);

    expect(getByText('Paste')).toBeOnTheScreen();
  });
});
