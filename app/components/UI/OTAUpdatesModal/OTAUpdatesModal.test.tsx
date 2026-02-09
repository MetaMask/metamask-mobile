import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { reloadAsync } from 'expo-updates';
import Logger from '../../../util/Logger';
import { MetaMetricsEvents } from '../../../core/Analytics';
import renderWithProvider from '../../../util/test/renderWithProvider';

// Mock theme utility
jest.mock('../../../util/theme', () => ({
  useAssetFromTheme: jest.fn(() => ({ uri: 'mock-logo' })),
}));

// Create a mock tailwind function that can be called and has a style method
const mockTw = Object.assign(
  jest.fn(() => ({})),
  {
    style: jest.fn(() => ({})),
  },
);

// Mock tailwind
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => mockTw,
}));

// Mock HeaderCompactStandard
jest.mock(
  '../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View: ReactNativeView } = jest.requireActual('react-native');

    return (props: { children: React.ReactNode }) =>
      ReactActual.createElement(
        ReactNativeView,
        { testID: 'header' },
        props.children,
      );
  },
);

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const { forwardRef, useImperativeHandle } = jest.requireActual('react');

    const MockBottomSheet = forwardRef(
      (props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
        useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: jest.fn((callback?: () => void) => {
            if (callback) callback();
          }),
        }));

        return (
          <View testID="bottom-sheet" {...props}>
            {props.children}
          </View>
        );
      },
    );

    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(),
}));

jest.mock('../../../util/metrics', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

const mockReloadAsync = reloadAsync as jest.MockedFunction<typeof reloadAsync>;
const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;

interface MockEventBuilder {
  addProperties: jest.Mock;
  build: jest.Mock;
}

const mockCreateEventBuilder = jest.fn((event: string): MockEventBuilder => {
  const builder: MockEventBuilder = {
    addProperties: jest.fn(),
    build: jest.fn(),
  };

  builder.addProperties.mockReturnValue(builder);
  builder.build.mockReturnValue({ event });

  return builder;
});

const mockTrackEvent = jest.fn();

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Import component AFTER all mocks are defined
import OTAUpdatesModal from './OTAUpdatesModal';

describe('OTAUpdatesModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as unknown as { OS: string }).OS = 'ios';
  });

  it('tracks view event on mount', () => {
    renderWithProvider(<OTAUpdatesModal />);

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: MetaMetricsEvents.OTA_UPDATES_MODAL_VIEWED,
      }),
    );
  });

  it('tracks primary action when primary button is pressed', async () => {
    const { getByText } = renderWithProvider(<OTAUpdatesModal />);

    fireEvent.press(getByText('Reload'));

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: MetaMetricsEvents.OTA_UPDATES_MODAL_PRIMARY_ACTION_CLICKED,
        }),
      );
    });
  });

  it('reloads app when reload button is pressed on iOS', async () => {
    const { getByText } = renderWithProvider(<OTAUpdatesModal />);

    fireEvent.press(getByText('Reload'));

    await waitFor(() => {
      expect(mockReloadAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('does not reload app when reload button is pressed on Android', async () => {
    (Platform as unknown as { OS: string }).OS = 'android';

    const { getByText } = renderWithProvider(<OTAUpdatesModal />);

    fireEvent.press(getByText('Got it'));

    await waitFor(() => {
      expect(mockReloadAsync).not.toHaveBeenCalled();
    });
  });

  it('logs error when reloadAsync throws', async () => {
    const reloadError = new Error('Reload failed');

    mockReloadAsync.mockRejectedValueOnce(reloadError);

    const { getByText } = renderWithProvider(<OTAUpdatesModal />);

    fireEvent.press(getByText('Reload'));

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        reloadError,
        'OTA Updates: Error reloading app after modal reload pressed',
      );
    });
  });
});
