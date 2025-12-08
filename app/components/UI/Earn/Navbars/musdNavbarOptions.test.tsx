import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { getMusdConversionNavbarOptions } from './musdNavbarOptions';
import { mockTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockStrings = strings as jest.MockedFunction<typeof strings>;

describe('getMusdConversionNavbarOptions', () => {
  const mockGoBack = jest.fn();
  const mockCanGoBack = jest.fn();

  const createMockNavigation = () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns navbar options with expected structure', () => {
    const navigation = createMockNavigation();
    const chainId = CHAIN_IDS.MAINNET;

    const options = getMusdConversionNavbarOptions(
      navigation,
      mockTheme,
      chainId,
    );

    expect(options.headerTitleAlign).toBe('center');
    expect(typeof options.headerTitle).toBe('function');
    expect(typeof options.headerLeft).toBe('function');
    expect(options.headerStyle.backgroundColor).toBe(
      mockTheme.colors.background.alternative,
    );
  });

  it('renders headerTitle with mUSD icon, network badge, and localized text', () => {
    const navigation = createMockNavigation();
    const chainId = CHAIN_IDS.MAINNET;

    const options = getMusdConversionNavbarOptions(
      navigation,
      mockTheme,
      chainId,
    );

    const HeaderTitle = options.headerTitle as React.FC;
    const { getByTestId, getByText } = render(<HeaderTitle />);

    expect(getByTestId('musd-token-icon')).toBeOnTheScreen();
    expect(getByTestId('badge-wrapper-badge')).toBeOnTheScreen();
    expect(getByTestId('badgenetwork')).toBeOnTheScreen();
    expect(mockStrings).toHaveBeenCalledWith(
      'earn.musd_conversion.convert_to_musd',
    );
    expect(getByText('earn.musd_conversion.convert_to_musd')).toBeOnTheScreen();
  });

  it('calls goBack when back button pressed and canGoBack returns true', () => {
    const navigation = createMockNavigation();
    mockCanGoBack.mockReturnValue(true);
    const chainId = CHAIN_IDS.MAINNET;

    const options = getMusdConversionNavbarOptions(
      navigation,
      mockTheme,
      chainId,
    );

    const HeaderLeft = options.headerLeft as React.FC;
    const { getByTestId } = render(<HeaderLeft />);

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call goBack when canGoBack returns false', () => {
    const navigation = createMockNavigation();
    mockCanGoBack.mockReturnValue(false);
    const chainId = CHAIN_IDS.MAINNET;

    const options = getMusdConversionNavbarOptions(
      navigation,
      mockTheme,
      chainId,
    );

    const HeaderLeft = options.headerLeft as React.FC;
    const { getByTestId } = render(<HeaderLeft />);

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    expect(mockCanGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
