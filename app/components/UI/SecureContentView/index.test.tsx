import React from 'react';
import { Platform, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import SecureContentView from './';
import Logger from '../../../util/Logger';

jest.mock('../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('SecureContentView', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = originalPlatform;
  });

  afterAll(() => {
    Platform.OS = originalPlatform;
  });

  it('renders its children', () => {
    const { getByText } = render(
      <SecureContentView>
        <Text>secret content</Text>
      </SecureContentView>,
    );

    expect(getByText('secret content')).toBeOnTheScreen();
  });

  it('falls back to a plain View on Android, where FLAG_SECURE handles protection', () => {
    Platform.OS = 'android';

    const { getByText, UNSAFE_queryAllByType } = render(
      <SecureContentView>
        <Text>secret content</Text>
      </SecureContentView>,
    );

    expect(getByText('secret content')).toBeOnTheScreen();
    expect(
      UNSAFE_queryAllByType(
        'ExpoScreenCapture' as unknown as React.ComponentType,
      ),
    ).toHaveLength(0);
  });

  it('reports an error when the native secure canvas is unavailable', () => {
    const { UNSAFE_root } = render(
      <SecureContentView>
        <Text>secret content</Text>
      </SecureContentView>,
    );

    const nativeView = UNSAFE_root.findByType(
      'ExpoScreenCapture' as unknown as React.ComponentType,
    );
    nativeView.props.onStatus({ nativeEvent: { usingSecureCanvas: false } });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'SecureContentView: secure canvas unavailable',
      }),
      expect.objectContaining({
        tags: { feature: 'screen-capture-protection' },
      }),
    );
  });

  it('does not report an error when the secure canvas is in use', () => {
    const { UNSAFE_root } = render(
      <SecureContentView>
        <Text>secret content</Text>
      </SecureContentView>,
    );

    const nativeView = UNSAFE_root.findByType(
      'ExpoScreenCapture' as unknown as React.ComponentType,
    );
    nativeView.props.onStatus({ nativeEvent: { usingSecureCanvas: true } });

    expect(Logger.error).not.toHaveBeenCalled();
  });
});
