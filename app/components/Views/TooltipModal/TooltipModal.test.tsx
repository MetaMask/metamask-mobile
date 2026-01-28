import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider, Metrics } from 'react-native-safe-area-context';

import TooltipModal from './';
import { TooltipModalProps } from './ToolTipModal.types';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';

const mockOnCloseBottomSheet = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return ReactActual.forwardRef(
      (props: { children?: React.ReactNode }, ref: React.Ref<unknown>) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
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

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const createRouteData = (
  overrides: Partial<TooltipModalProps['route']['params']> = {},
): TooltipModalProps => ({
  route: {
    params: {
      title: 'Test Tooltip',
      tooltip: 'This is a test tooltip',
      ...overrides,
    },
  },
});

const renderTooltipModal = (props: TooltipModalProps = createRouteData()) =>
  renderWithProvider(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <TooltipModal {...props} />
    </SafeAreaProvider>,
  );

describe('TooltipModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders with string tooltip content', () => {
      const { getByText } = renderTooltipModal();

      expect(getByText('Test Tooltip')).toBeOnTheScreen();
      expect(getByText('This is a test tooltip')).toBeOnTheScreen();
    });

    it('renders with ReactNode tooltip content', () => {
      const customTooltip = <Text testID="custom-tooltip">Custom Content</Text>;
      const props = createRouteData({ tooltip: customTooltip });

      const { getByTestId } = renderTooltipModal(props);

      expect(getByTestId('custom-tooltip')).toBeOnTheScreen();
    });

    it('renders the Got It button', () => {
      const { getByText } = renderTooltipModal();

      expect(getByText(strings('browser.got_it'))).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('closes the bottom sheet when Got It button is pressed', () => {
      const { getByText } = renderTooltipModal();

      const gotItButton = getByText(strings('browser.got_it'));
      fireEvent.press(gotItButton);

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
  });
});
