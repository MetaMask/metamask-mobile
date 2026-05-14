import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import { Linking } from 'react-native';
import { useMusdConversionNavbar } from './useMusdConversionNavbar';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';
import { strings } from '../../../../../locales/i18n';
import { NavbarOverrides } from '../../../Views/confirmations/components/UI/navbar/navbar';
import { MUSD_CONVERSION_APY } from '../constants/musd';
import AppConstants from '../../../../core/AppConstants';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../constants/events';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../Views/confirmations/hooks/ui/useNavbar');

const mockUseNavbar = useNavbar as jest.MockedFunction<typeof useNavbar>;
const mockStrings = strings as jest.MockedFunction<typeof strings>;

describe('useMusdConversionNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls useNavbar with correct title and addBackButton parameters', () => {
    renderHook(() => useMusdConversionNavbar());

    expect(mockUseNavbar).toHaveBeenCalledTimes(1);
    expect(mockStrings).toHaveBeenCalledWith(
      'earn.musd_conversion.convert_and_get_percentage_bonus',
      { percentage: MUSD_CONVERSION_APY },
    );
    expect(mockUseNavbar).toHaveBeenCalledWith(
      'earn.musd_conversion.convert_and_get_percentage_bonus',
      true,
      expect.objectContaining({
        headerTitle: expect.any(Function),
        headerLeft: expect.any(Function),
        headerRight: expect.any(Function),
      }),
    );
  });

  it('returns a TooltipNode element', () => {
    const { result } = renderHook(() => useMusdConversionNavbar());

    expect(React.isValidElement(result.current.TooltipNode)).toBe(true);
  });

  it('provides headerTitle override that renders the heading', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    renderHook(() => useMusdConversionNavbar());

    expect(capturedOverrides?.headerTitle).toBeDefined();

    const HeaderTitle = capturedOverrides?.headerTitle as React.FC;
    const { getByText } = render(<HeaderTitle />);

    expect(
      getByText('earn.musd_conversion.convert_and_get_percentage_bonus'),
    ).toBeOnTheScreen();
  });

  it('provides headerLeft override that renders back button', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    renderHook(() => useMusdConversionNavbar());

    expect(capturedOverrides?.headerLeft).toBeDefined();

    const mockOnBackPress = jest.fn();
    const headerLeftFn = capturedOverrides?.headerLeft as (
      onBackPress: () => void,
    ) => React.ReactNode;
    const HeaderLeft = () => <>{headerLeftFn(mockOnBackPress)}</>;

    const { getByTestId } = render(<HeaderLeft />);

    const backButton = getByTestId('button-icon');
    expect(backButton).toBeOnTheScreen();
  });

  it('calls provided onBackPress when back button is pressed', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    renderHook(() => useMusdConversionNavbar());

    const mockOnBackPress = jest.fn();
    const headerLeftFn = capturedOverrides?.headerLeft as (
      onBackPress: () => void,
    ) => React.ReactNode;
    const HeaderLeft = () => <>{headerLeftFn(mockOnBackPress)}</>;

    const { getByTestId } = render(<HeaderLeft />);

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    expect(mockOnBackPress).toHaveBeenCalledTimes(1);
  });

  it('provides headerRight override that renders info button', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    renderHook(() => useMusdConversionNavbar());

    expect(capturedOverrides?.headerRight).toBeDefined();

    const HeaderRight = capturedOverrides?.headerRight as React.FC;
    const { getByTestId } = render(<HeaderRight />);

    expect(getByTestId('button-icon')).toBeOnTheScreen();
  });

  it('opens tooltip modal when info button is pressed', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    const Harness = () => {
      const { TooltipNode } = useMusdConversionNavbar();
      const HeaderRight = capturedOverrides?.headerRight as React.FC;
      return (
        <>
          <HeaderRight />
          {TooltipNode}
        </>
      );
    };

    const { getByTestId } = render(<Harness />);

    fireEvent.press(getByTestId('button-icon'));

    expect(
      getByTestId('musd-conversion-navbar-tooltip-terms-link'),
    ).toBeOnTheScreen();
  });

  it('opens bonus terms of use and tracks event when "Terms apply" is pressed', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);

    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    const Harness = () => {
      const { TooltipNode } = useMusdConversionNavbar();
      const HeaderRight = capturedOverrides?.headerRight as React.FC;
      return (
        <>
          <HeaderRight />
          {TooltipNode}
        </>
      );
    };

    const { getByTestId } = render(<Harness />);

    fireEvent.press(getByTestId('button-icon'));
    fireEvent.press(getByTestId('musd-conversion-navbar-tooltip-terms-link'));

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
});
