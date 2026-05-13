import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyConvertInfoSheet from './MoneyConvertInfoSheet';
import { MoneyConvertInfoSheetTestIds } from './MoneyConvertInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events';
import AppConstants from '../../../../../core/AppConstants';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockGoBack = jest.fn();

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(View, { testID }, children);
    },
  );

  const MockBottomSheetHeader = ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'bottom-sheet-header' },
      ReactActual.createElement(
        Pressable,
        { testID: 'bottom-sheet-close-button', onPress: onClose },
        ReactActual.createElement(RNText, {}, 'close'),
      ),
      children,
    );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

describe('MoneyConvertInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(<MoneyConvertInfoSheet />);

    expect(
      getByTestId(MoneyConvertInfoSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the sheet title with the bonus percentage interpolated', () => {
    const { getByText } = renderWithProvider(<MoneyConvertInfoSheet />);

    expect(
      getByText(
        strings('earn.musd_conversion.convert_and_get_percentage_bonus', {
          percentage: MUSD_CONVERSION_APY,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the description (with Powered by Relay inline) and terms link', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MoneyConvertInfoSheet />,
    );

    expect(
      getByText(
        strings('earn.musd_conversion.convert_tooltip_description', {
          percentage: MUSD_CONVERSION_APY,
        }),
        { exact: false },
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyConvertInfoSheetTestIds.TERMS_LINK),
    ).toBeOnTheScreen();
  });

  it('opens the bonus terms URL and tracks the event when terms apply is pressed', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);

    const { getByTestId } = renderWithProvider(<MoneyConvertInfoSheet />);

    fireEvent.press(getByTestId(MoneyConvertInfoSheetTestIds.TERMS_LINK));

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.CUSTOM_AMOUNT_NAVBAR,
      url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    expect(openUrlSpy).toHaveBeenCalledWith(
      AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
    );
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(<MoneyConvertInfoSheet />);

    fireEvent.press(getByTestId('bottom-sheet-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
