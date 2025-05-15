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

    it('calls ClipboardManager.setString when non-sensitive text is clicked', async () => {
      const { getByText } = renderInterface(
        Copyable({ value: 'Copy this text' }),
      );

      const textElement = getByText('Copy this text');
      fireEvent.press(textElement);

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
      const container = getByText('Secret to copy').parent!;
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
