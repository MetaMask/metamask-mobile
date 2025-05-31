/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { fireEvent, waitFor } from '@testing-library/react-native';
import ClipboardManager from '../../../../core/ClipboardManager';
import { Copyable } from '@metamask/snaps-sdk/jsx';
import { renderInterface } from '../testUtils';
import { copyable } from './copyable';

// Mock the ClipboardManager
jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

// Mock the strings function from i18n
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn().mockImplementation((key) => {
    if (key === 'snap_ui.revealSensitiveContent.message') {
      return 'Reveal sensitive content';
    }
    if (key === 'snap_ui.show_more') {
      return 'Show more';
    }
    if (key === 'snap_ui.show_less') {
      return 'Show less';
    }
    return key;
  }),
}));

// Mock Engine
jest.mock('../../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
  },
}));

describe('SnapUICopyable', () => {
  // Tests for the factory function
  describe('copyable factory function', () => {
    // Create a mock theme object
    const mockTheme = {
      colors: {
        text: { default: '#000000' },
        background: { default: '#FFFFFF' },
      },
    };

    // Create base params that match UIComponentParams interface
    const baseParams = {
      map: {},
      t: (key: string) => key,
      theme: mockTheme as any,
    };

    it('should transform a CopyableElement to SnapUICopyable configuration', () => {
      // Create a mock element that matches what copyable expects
      const e = {
        type: 'Copyable',
        props: {
          value: 'Text to copy',
          sensitive: false,
        },
        key: 'test-key',
      };

      // Pass all required parameters to the factory function
      const result = copyable({
        ...baseParams,
        element: e,
      } as any);

      expect(result).toEqual({
        element: 'SnapUICopyable',
        props: {
          text: 'Text to copy',
          sensitive: false,
        },
      });
    });

    it('should handle sensitive flag', () => {
      const e = {
        type: 'Copyable',
        props: {
          value: 'Sensitive data',
          sensitive: true,
        },
        key: 'test-key',
      };

      const result = copyable({
        ...baseParams,
        element: e,
      } as any);

      expect(result).toEqual({
        element: 'SnapUICopyable',
        props: {
          text: 'Sensitive data',
          sensitive: true,
        },
      });
    });

    it('should handle missing sensitive flag (defaults to undefined)', () => {
      const e = {
        type: 'Copyable',
        props: {
          value: 'Text to copy',
        },
        key: 'test-key',
      };

      const result = copyable({
        ...baseParams,
        element: e,
      } as any);

      expect(result).toEqual({
        element: 'SnapUICopyable',
        props: {
          text: 'Text to copy',
          sensitive: undefined,
        },
      });
    });
  });

  // Tests for the component
  describe('component functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders regular text correctly', () => {
      const { getByText } = renderInterface(Copyable({ value: 'Test text' }));

      expect(getByText('Test text')).toBeDefined();
    });

    it('renders sensitive content hidden by default', () => {
      const { getByText, getByTestId, queryByText } = renderInterface(
        Copyable({ value: 'Secret data', sensitive: true }),
      );

      // Check that reveal message is shown
      expect(getByText('Reveal sensitive content')).toBeDefined();

      // Check that the eye icon is shown
      expect(getByTestId('reveal-icon')).toBeDefined();

      // Check that text is not visible
      expect(queryByText('Secret data')).toBeNull();
    });

    it('reveals sensitive content when clicked', () => {
      const { getByText, getByTestId, queryByText } = renderInterface(
        Copyable({ value: 'Secret data', sensitive: true }),
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
      const { getByTestId, queryByText } = renderInterface(
        Copyable({ value: 'Secret data', sensitive: true }),
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

    it('truncates long text and shows "more" button', () => {
      // Create text longer than the 100 character limit
      const longText = 'A'.repeat(150);
      const { getByTestId, getByText } = renderInterface(
        Copyable({ value: longText }),
      );

      // Should show truncated text
      const truncatedText = 'A'.repeat(100) + '...';
      expect(getByTestId('copyable-text').props.children).toBe(truncatedText);

      // Should show "Show more" button
      expect(getByText('Show more')).toBeDefined();
    });

    it('expands truncated text when clicking "more" button', () => {
      const longText = 'A'.repeat(150);
      const { getByTestId, getByText } = renderInterface(
        Copyable({ value: longText }),
      );

      // Initially truncated
      expect(getByTestId('copyable-text').props.children).toBe(
        'A'.repeat(100) + '...',
      );

      // Click "Show more"
      fireEvent.press(getByTestId('more-button'));

      // Should now show full text
      expect(getByTestId('copyable-text').props.children).toBe(longText);

      // Should show "Show less" button
      expect(getByText('Show less')).toBeDefined();

      // Click "Show less"
      fireEvent.press(getByTestId('more-button'));

      // Should truncate again
      expect(getByTestId('copyable-text').props.children).toBe(
        'A'.repeat(100) + '...',
      );
    });

    it('does not show "more" button for short text', () => {
      const shortText = 'Short text under the limit';
      const { queryByTestId } = renderInterface(Copyable({ value: shortText }));

      // No "more" button
      expect(queryByTestId('more-button')).toBeNull();
    });

    it('calls ClipboardManager.setString when non-sensitive text is clicked', async () => {
      const { getByText } = renderInterface(
        Copyable({ value: 'Copy this text' }),
      );

      const textElement = getByText('Copy this text');
      fireEvent.press(textElement.parent!);

      await waitFor(() => {
        expect(ClipboardManager.setString).toHaveBeenCalledWith(
          'Copy this text',
        );
      });
    });

    it('calls ClipboardManager.setString when revealed sensitive text is clicked', async () => {
      const { getByTestId, getByText } = renderInterface(
        Copyable({ value: 'Secret to copy', sensitive: true }),
      );

      // Click to reveal
      fireEvent.press(getByTestId('reveal-icon'));

      // Now click the text to copy
      const container = getByText('Secret to copy').parent!.parent!;
      fireEvent.press(container);

      await waitFor(() => {
        expect(ClipboardManager.setString).toHaveBeenCalledWith(
          'Secret to copy',
        );
      });
    });

    it('changes icon after copying text', async () => {
      const { getByTestId } = renderInterface(
        Copyable({ value: 'Copy this text' }),
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
});
