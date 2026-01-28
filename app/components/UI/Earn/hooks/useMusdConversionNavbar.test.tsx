import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import { Linking } from 'react-native';
import { useMusdConversionNavbar } from './useMusdConversionNavbar';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';
import { strings } from '../../../../../locales/i18n';
import { NavbarOverrides } from '../../../Views/confirmations/components/UI/navbar/navbar';
import useTooltipModal from '../../../hooks/useTooltipModal';
import { MUSD_CONVERSION_APY } from '../constants/musd';
import AppConstants from '../../../../core/AppConstants';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../Views/confirmations/hooks/ui/useNavbar');

jest.mock('../../../hooks/useTooltipModal');

const mockUseNavbar = useNavbar as jest.MockedFunction<typeof useNavbar>;
const mockStrings = strings as jest.MockedFunction<typeof strings>;
const mockUseTooltipModal = useTooltipModal as jest.MockedFunction<
  typeof useTooltipModal
>;

describe('useMusdConversionNavbar', () => {
  const mockOpenTooltipModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTooltipModal.mockReturnValue({
      openTooltipModal: mockOpenTooltipModal,
    });
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

    renderHook(() => useMusdConversionNavbar());

    const HeaderRight = capturedOverrides?.headerRight as React.FC;
    const { getByTestId } = render(<HeaderRight />);

    fireEvent.press(getByTestId('button-icon'));

    expect(mockOpenTooltipModal).toHaveBeenCalledTimes(1);
    expect(mockOpenTooltipModal).toHaveBeenCalledWith(
      'earn.musd_conversion.convert_and_get_percentage_bonus',
      expect.any(Object),
      'earn.musd_conversion.powered_by_relay',
      'earn.musd_conversion.ok',
    );
  });

  it('opens bonus terms of use when "Terms apply" is pressed in tooltip content', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);

    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    renderHook(() => useMusdConversionNavbar());

    const HeaderRight = capturedOverrides?.headerRight as React.FC;
    const { getByTestId } = render(<HeaderRight />);

    fireEvent.press(getByTestId('button-icon'));

    const tooltipBody = mockOpenTooltipModal.mock
      .calls[0][1] as React.ReactElement;
    const { getByText } = render(tooltipBody);

    fireEvent.press(getByText('earn.musd_conversion.education.terms_apply'));

    expect(openUrlSpy).toHaveBeenCalledTimes(1);
    expect(openUrlSpy).toHaveBeenCalledWith(
      AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
    );
  });
});
