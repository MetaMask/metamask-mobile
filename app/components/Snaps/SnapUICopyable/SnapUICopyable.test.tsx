import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { SnapUICopyable } from './SnapUICopyable';
import ClipboardManager from '../../../core/ClipboardManager';

// Mock the ClipboardManager
jest.mock('../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

// Mock the strings function from i18n
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key) => {
    if (key === 'snap_ui.revealSensitiveContent.message') {
      return 'Reveal sensitive content';
    }
    return key;
  }),
}));

describe('SnapUICopyable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders regular text correctly', () => {
    const { getByText } = renderWithProvider(
      <SnapUICopyable text="Test text" />,
    );

    expect(getByText('Test text')).toBeDefined();
  });

  it('renders sensitive content hidden by default', () => {
    const { getByText, getByTestId, queryByText } = renderWithProvider(
      <SnapUICopyable text="Secret data" sensitive={true} />,
    );

    // Check that reveal message is shown
    expect(getByText('Reveal sensitive content')).toBeDefined();

    // Check that the eye icon is shown
    expect(getByTestId('reveal-icon')).toBeDefined();

    // Check that text is not visible
    expect(queryByText('Secret data')).toBeNull();
  });

  it('reveals sensitive content when clicked', () => {
    const { getByText, getByTestId, queryByText } = renderWithProvider(
      <SnapUICopyable text="Secret data" sensitive={true} />,
    );

    // Initially hidden
    expect(queryByText('Secret data')).toBeNull();

    // Click to reveal
    const revealIcon = getByTestId('reveal-icon');
    fireEvent.press(revealIcon);

    // Now visible
    expect(getByText('Secret data')).toBeDefined();

    // Check that copy icon is shown
    expect(getByTestId('copy-icon')).toBeDefined();
  });

  it('toggles visibility of sensitive content', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <SnapUICopyable text="Secret data" sensitive={true} />,
    );

    // Initially hidden
    expect(queryByText('Secret data')).toBeNull();

    // Click to reveal
    fireEvent.press(getByTestId('reveal-icon'));

    // Now visible
    expect(queryByText('Secret data')).toBeDefined();

    // Click to hide again
    fireEvent.press(getByTestId('reveal-icon'));

    // Hidden again
    expect(queryByText('Secret data')).toBeNull();
  });

  it('calls ClipboardManager.setString when non-sensitive text is clicked', async () => {
    const { getByText } = renderWithProvider(
      <SnapUICopyable text="Copy this text" />,
    );

    const textElement = getByText('Copy this text');
    fireEvent.press(textElement);

    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith('Copy this text');
    });
  });

  it('calls ClipboardManager.setString when revealed sensitive text is clicked', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <SnapUICopyable text="Secret to copy" sensitive={true} />,
    );

    // Click to reveal
    fireEvent.press(getByTestId('reveal-icon'));

    // Now click the text to copy
    const container = getByText('Secret to copy').parent!;
    fireEvent.press(container);

    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith('Secret to copy');
    });
  });

  it('changes icon after copying text', async () => {
    const { getByTestId } = renderWithProvider(
      <SnapUICopyable text="Copy this text" />,
    );

    // Initially should show copy icon
    const initialIcon = getByTestId('copy-icon');
    expect(initialIcon.props.name).toBe('Copy');

    // Click to copy
    fireEvent.press(initialIcon.parent!);

    // Should now show copy success icon
    await waitFor(() => {
      const updatedIcon = getByTestId('copy-icon');
      expect(updatedIcon.props.name).toBe('CopySuccess');
    });
  });
});
