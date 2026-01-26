import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdConversionNavbar } from './useMusdConversionNavbar';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';
import { strings } from '../../../../../locales/i18n';
import { NavbarOverrides } from '../../../Views/confirmations/components/UI/navbar/navbar';
import { getNetworkImageSource } from '../../../../util/networks';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../Views/confirmations/hooks/ui/useNavbar');

jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(),
}));

const mockUseNavbar = useNavbar as jest.MockedFunction<typeof useNavbar>;
const mockStrings = strings as jest.MockedFunction<typeof strings>;
const mockGetNetworkImageSource = getNetworkImageSource as jest.MockedFunction<
  typeof getNetworkImageSource
>;

describe('useMusdConversionNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls useNavbar with correct title and addBackButton parameters', () => {
    renderHook(() => useMusdConversionNavbar(CHAIN_IDS.MAINNET));

    expect(mockUseNavbar).toHaveBeenCalledTimes(1);
    expect(mockStrings).toHaveBeenCalledWith(
      'earn.musd_conversion.convert_to_musd',
    );
    expect(mockUseNavbar).toHaveBeenCalledWith(
      'earn.musd_conversion.convert_to_musd',
      true,
      expect.objectContaining({
        headerTitle: expect.any(Function),
        headerLeft: expect.any(Function),
      }),
    );
  });

  it('provides headerTitle override that renders mUSD icon with network badge', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    renderHook(() => useMusdConversionNavbar(CHAIN_IDS.MAINNET));

    expect(capturedOverrides?.headerTitle).toBeDefined();

    const HeaderTitle = capturedOverrides?.headerTitle as React.FC;
    const { getByTestId, getByText } = render(<HeaderTitle />);

    expect(getByTestId('musd-token-icon')).toBeOnTheScreen();
    expect(getByTestId('badge-wrapper-badge')).toBeOnTheScreen();
    expect(getByTestId('badgenetwork')).toBeOnTheScreen();
    expect(getByText('earn.musd_conversion.convert_to_musd')).toBeOnTheScreen();
  });

  it('provides headerLeft override that renders back button', () => {
    let capturedOverrides: NavbarOverrides | undefined;
    mockUseNavbar.mockImplementation((_title, _addBackButton, overrides) => {
      capturedOverrides = overrides;
    });

    renderHook(() => useMusdConversionNavbar(CHAIN_IDS.MAINNET));

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

    renderHook(() => useMusdConversionNavbar(CHAIN_IDS.MAINNET));

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

  it('passes Linea chainId to getNetworkImageSource', () => {
    renderHook(() => useMusdConversionNavbar(CHAIN_IDS.LINEA_MAINNET));

    expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
      chainId: CHAIN_IDS.LINEA_MAINNET,
    });
  });

  it('passes Mainnet chainId to getNetworkImageSource', () => {
    renderHook(() => useMusdConversionNavbar(CHAIN_IDS.MAINNET));

    expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
      chainId: CHAIN_IDS.MAINNET,
    });
  });
});
