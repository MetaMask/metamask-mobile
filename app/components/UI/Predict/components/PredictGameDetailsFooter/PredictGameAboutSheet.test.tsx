import React, { useRef, useEffect } from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import PredictGameAboutSheet from './PredictGameAboutSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Logger from '../../../../../util/Logger';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'predict.tabs.about') {
      return 'About';
    }
    if (key === 'predict.game_details_footer.read_terms') {
      return 'Read the full contract terms and conditions';
    }
    return key;
  }),
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (
        props: {
          children?: React.ReactNode;
          onClose?: () => void;
          shouldNavigateBack?: boolean;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
          onOpenBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            props.onClose?.();
            callback?.();
          },
          onOpenBottomSheet: (callback?: () => void) => {
            callback?.();
          },
        }));

        return ReactActual.createElement(
          View,
          { testID: 'bottom-sheet' },
          props.children,
        );
      },
    );
  },
);

jest.mock(
  '../../../../../component-library/components/Sheet/SheetHeader',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Text: RNText } = jest.requireActual('react-native');
    return ({ title }: { title: string }) =>
      ReactActual.createElement(RNText, { testID: 'sheet-header' }, title);
  },
);

const defaultDescription =
  'Who will win the Super Bowl game? Get $1 for every contract you own if your prediction is correct.';

describe('PredictGameAboutSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders bottom sheet', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictGameAboutSheet ref={ref} description={defaultDescription} />
        );
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('renders header with About title', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictGameAboutSheet ref={ref} description={defaultDescription} />
        );
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText('About')).toBeOnTheScreen();
    });

    it('renders market description', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictGameAboutSheet ref={ref} description={defaultDescription} />
        );
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText(defaultDescription)).toBeOnTheScreen();
    });

    it('renders terms link', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictGameAboutSheet ref={ref} description={defaultDescription} />
        );
      };

      const { getByText } = render(<TestComponent />);

      expect(
        getByText('Read the full contract terms and conditions'),
      ).toBeOnTheScreen();
    });
  });

  describe('terms link', () => {
    it('opens Polymarket terms URL when pressed', async () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictGameAboutSheet ref={ref} description={defaultDescription} />
        );
      };

      const { getByText } = render(<TestComponent />);

      await act(async () => {
        fireEvent.press(
          getByText('Read the full contract terms and conditions'),
        );
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://polymarket.com/tos',
      );
    });

    it('calls openURL only once per press', async () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictGameAboutSheet ref={ref} description={defaultDescription} />
        );
      };

      const { getByText } = render(<TestComponent />);

      await act(async () => {
        fireEvent.press(
          getByText('Read the full contract terms and conditions'),
        );
      });

      expect(Linking.openURL).toHaveBeenCalledTimes(1);
    });

    it('logs error when Linking.openURL fails', async () => {
      const mockError = new Error('Failed to open URL');
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(mockError);

      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictGameAboutSheet ref={ref} description={defaultDescription} />
        );
      };

      const { getByText } = render(<TestComponent />);

      await act(async () => {
        fireEvent.press(
          getByText('Read the full contract terms and conditions'),
        );
      });

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(mockError, {
          message: 'Failed to open Polymarket terms URL',
          feature: 'predict',
          operation: 'openTermsUrl',
        });
      });
    });
  });

  describe('bottom sheet behavior', () => {
    it('calls onClose callback when bottom sheet closes', () => {
      const mockOnClose = jest.fn();
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onCloseBottomSheet();
          });
        }, []);

        return (
          <PredictGameAboutSheet
            ref={ref}
            description={defaultDescription}
            onClose={mockOnClose}
          />
        );
      };

      render(<TestComponent />);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not crash when onClose is not provided', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);

        useEffect(() => {
          act(() => {
            ref.current?.onCloseBottomSheet();
          });
        }, []);

        return (
          <PredictGameAboutSheet ref={ref} description={defaultDescription} />
        );
      };

      expect(() => render(<TestComponent />)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('renders with empty description', () => {
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return <PredictGameAboutSheet ref={ref} description="" />;
      };

      const { getByTestId } = render(<TestComponent />);

      expect(getByTestId('bottom-sheet')).toBeOnTheScreen();
    });

    it('renders with long description', () => {
      const longDescription =
        'This is a very long description that contains multiple sentences. It explains the market resolution criteria in detail. The market will resolve to Yes if the event occurs, and No otherwise. Additional context and rules may apply.';
      const TestComponent = () => {
        const ref = useRef<BottomSheetRef>(null);
        return (
          <PredictGameAboutSheet ref={ref} description={longDescription} />
        );
      };

      const { getByText } = render(<TestComponent />);

      expect(getByText(longDescription)).toBeOnTheScreen();
    });
  });
});
