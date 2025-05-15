import { UIComponentParams } from './types';
import { copyable } from './copyable';

describe('copyable factory', () => {
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
    const element = {
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
      element,
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
    const element = {
      type: 'Copyable',
      props: {
        value: 'Sensitive data',
        sensitive: true,
      },
      key: 'test-key',
    };

    const result = copyable({
      ...baseParams,
      element,
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
    const element = {
      type: 'Copyable',
      props: {
        value: 'Text to copy',
      },
      key: 'test-key',
    };

    const result = copyable({
      ...baseParams,
      element,
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
