import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyClaimableBonusInfoSheet from './MoneyClaimableBonusInfoSheet';
import { MoneyClaimableBonusInfoSheetTestIds } from './MoneyClaimableBonusInfoSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
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

describe('MoneyClaimableBonusInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));
  });

  it('renders the container', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyClaimableBonusInfoSheet />,
    );

    expect(
      getByTestId(MoneyClaimableBonusInfoSheetTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders the sheet title', () => {
    const { getByText } = renderWithProvider(<MoneyClaimableBonusInfoSheet />);

    expect(getByText(strings('earn.claimable_bonus'))).toBeOnTheScreen();
  });

  it('renders the tooltip body text and a terms apply link', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MoneyClaimableBonusInfoSheet />,
    );

    expect(
      getByText(strings('earn.claimable_bonus_tooltip'), { exact: false }),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyClaimableBonusInfoSheetTestIds.TERMS_LINK),
    ).toBeOnTheScreen();
  });

  it('opens the bonus terms URL and tracks the event when terms apply is pressed', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);

    const { getByTestId } = renderWithProvider(
      <MoneyClaimableBonusInfoSheet />,
    );

    fireEvent.press(
      getByTestId(MoneyClaimableBonusInfoSheetTestIds.TERMS_LINK),
    );

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.PERCENTAGE_ROW,
      url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    expect(openUrlSpy).toHaveBeenCalledWith(
      AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
    );
  });

  it('closes the sheet when the close button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <MoneyClaimableBonusInfoSheet />,
    );

    fireEvent.press(getByTestId('bottom-sheet-close-button'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
