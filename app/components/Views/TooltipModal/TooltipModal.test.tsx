import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import TooltipModal from './';
import { TooltipModalRouteParams } from './ToolTipModal.types';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { strings } from '../../../../locales/i18n';
import { useParams } from '../../../util/navigation/navUtils';

const mockOnCloseBottomSheet = jest.fn();

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      content: {},
      footerContainer: {},
      footerTextContainer: {},
    },
  }),
}));

jest.mock('../../../component-library/components/Texts/Text', () => {
  const { Text: ReactNativeText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactNativeText,
    TextVariant: {},
    TextColor: {},
  };
});

jest.mock('../../../component-library/components-temp/HeaderCenter', () => {
  const ReactActual = jest.requireActual('react');
  const {
    View: ReactNativeView,
    Text: ReactNativeText,
    Pressable: ReactNativePressable,
  } = jest.requireActual('react-native');

  return (props: { title: string; onClose: () => void }) =>
    ReactActual.createElement(
      ReactNativeView,
      { testID: 'tooltip-modal-header' },
      ReactActual.createElement(ReactNativeText, {}, props.title),
      ReactActual.createElement(
        ReactNativePressable,
        { testID: 'tooltip-modal-close', onPress: props.onClose },
        ReactActual.createElement(ReactNativeText, {}, 'close'),
      ),
    );
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

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const ReactActual = jest.requireActual('react');
    const {
      View: ReactNativeView,
      Text: ReactNativeText,
      Pressable: ReactNativePressable,
    } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray: { label: string; onPress: () => void }[];
      }) =>
        ReactActual.createElement(
          ReactNativeView,
          { testID: 'bottom-sheet-footer' },
          ...buttonPropsArray.map((buttonProps) =>
            ReactActual.createElement(
              ReactNativePressable,
              {
                key: buttonProps.label,
                onPress: buttonProps.onPress,
                testID: `footer-button-${buttonProps.label}`,
              },
              ReactActual.createElement(ReactNativeText, {}, buttonProps.label),
            ),
          ),
        ),
      ButtonsAlignment: { Horizontal: 'Horizontal' },
    };
  },
);

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => `i18n:${key}`,
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const createParams = (
  overrides: Partial<TooltipModalRouteParams> = {},
): TooltipModalRouteParams => ({
  title: 'Test Tooltip',
  tooltip: 'This is a test tooltip',
  ...overrides,
});

const arrangeParams = (overrides: Partial<TooltipModalRouteParams> = {}) => {
  mockUseParams.mockReturnValue(createParams(overrides));
};

const renderTooltipModal = () => renderWithProvider(<TooltipModal />);

describe('TooltipModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeParams();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders title and string tooltip content', () => {
      arrangeParams();

      const { getByText } = renderTooltipModal();

      expect(getByText('Test Tooltip')).toBeOnTheScreen();
      expect(getByText('This is a test tooltip')).toBeOnTheScreen();
    });

    it('renders with ReactNode tooltip content', () => {
      const customTooltip = <Text testID="custom-tooltip">Custom Content</Text>;
      arrangeParams({ tooltip: customTooltip });

      const { getByTestId } = renderTooltipModal();

      expect(getByTestId('custom-tooltip')).toBeOnTheScreen();
    });

    it('renders default footer button label when buttonText is undefined', () => {
      arrangeParams({ buttonText: undefined });

      const { getByText } = renderTooltipModal();

      expect(getByText(strings('browser.got_it'))).toBeOnTheScreen();
    });

    it('renders custom footer button label when buttonText is provided', () => {
      arrangeParams({ buttonText: 'Continue' });

      const { getByText } = renderTooltipModal();

      expect(getByText('Continue')).toBeOnTheScreen();
    });

    it('renders footerText when provided', () => {
      arrangeParams({ footerText: 'Footer copy' });

      const { getByText } = renderTooltipModal();

      expect(getByText('Footer copy')).toBeOnTheScreen();
    });

    it('does not render footerText when not provided', () => {
      arrangeParams({ footerText: undefined });

      const { queryByText } = renderTooltipModal();

      expect(queryByText('Footer copy')).toBeNull();
    });
  });

  describe('interactions', () => {
    it('closes the bottom sheet when footer button is pressed', () => {
      arrangeParams();

      const { getByText } = renderTooltipModal();

      const gotItButton = getByText(strings('browser.got_it'));
      fireEvent.press(gotItButton);

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
  });
});
