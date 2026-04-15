import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import MusdQuickConvertView, { MusdQuickConvertViewTestIds } from './index';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { selectMusdQuickConvertEnabledFlag } from '../../selectors/featureFlags';
import {
  createTokenChainKey,
  selectHasInFlightMusdConversion,
  selectHasUnapprovedMusdConversion,
  selectMusdConversionStatuses,
} from '../../selectors/musdConversionStatus';
import { MUSD_CONVERSION_APY } from '../../constants/musd';
import AppConstants from '../../../../../core/AppConstants';
import { Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../constants/events';
import { strings } from '../../../../../../locales/i18n';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../types/musd.types';
import { ConvertTokenRowTestIds } from '../../components/Musd/ConvertTokenRow';
import { useMusdBalance } from '../../hooks/useMusdBalance';
import { IconName } from '@metamask/design-system-react-native';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useFocusEffect: jest.fn(),
  };
});

jest.mock('../../hooks/useMusdConversionTokens');
jest.mock('../../hooks/useMusdConversion');
jest.mock('../../hooks/useMusdBalance');
jest.mock('../../selectors/featureFlags', () => ({
  ...jest.requireActual('../../selectors/featureFlags'),
  selectMusdQuickConvertEnabledFlag: jest.fn(),
}));
jest.mock('../../selectors/musdConversionStatus', () => ({
  ...jest.requireActual('../../selectors/musdConversionStatus'),
  selectHasInFlightMusdConversion: jest.fn(),
  selectHasUnapprovedMusdConversion: jest.fn(),
  selectMusdConversionStatuses: jest.fn(),
}));
const mockGetStakingNavbar = jest.fn<object, unknown[]>(() => ({}));
jest.mock('../../../Navbar', () => ({
  getStakingNavbar: (
    title: string,
    nav: unknown,
    colors: unknown,
    options?: { hasCancelButton?: boolean },
  ) => mockGetStakingNavbar(title, nav, colors, options),
}));
jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      headerContainer: {},
      headerTextContainer: {},
      listContainer: {},
      emptyContainer: {},
      listHeaderContainer: {},
      termsApply: {},
      balanceCardHeader: {},
    },
    theme: { colors: {} },
  })),
}));
jest.mock('../../utils/network', () => ({
  getNetworkName: jest.fn(() => 'Ethereum'),
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
}));

const mockSelectMusdQuickConvertEnabledFlag =
  selectMusdQuickConvertEnabledFlag as jest.MockedFunction<
    typeof selectMusdQuickConvertEnabledFlag
  >;
const mockUseMusdConversionTokens =
  useMusdConversionTokens as jest.MockedFunction<
    typeof useMusdConversionTokens
  >;
const mockUseMusdConversion = useMusdConversion as jest.MockedFunction<
  typeof useMusdConversion
>;
const mockUseMusdBalance = useMusdBalance as jest.MockedFunction<
  typeof useMusdBalance
>;
const mockSelectHasUnapprovedMusdConversion =
  selectHasUnapprovedMusdConversion as jest.MockedFunction<
    typeof selectHasUnapprovedMusdConversion
  >;
const mockSelectHasInFlightMusdConversion =
  selectHasInFlightMusdConversion as jest.MockedFunction<
    typeof selectHasInFlightMusdConversion
  >;
const mockSelectMusdConversionStatuses =
  selectMusdConversionStatuses as jest.MockedFunction<
    typeof selectMusdConversionStatuses
  >;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;

const createMockToken = (overrides: Partial<AssetType> = {}): AssetType => ({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
  chainId: '0x1' as Hex,
  symbol: 'USDC',
  decimals: 6,
  rawBalance: '0x5f5e100' as Hex,
  name: 'USD Coin',
  aggregators: [],
  image: 'https://example.com/usdc.png',
  balance: '100',
  logo: 'https://example.com/usdc.png',
  isETH: false,
  fiat: { balance: 100 },
  ...overrides,
});

describe('MusdQuickConvertView', () => {
  const mockInitiateMaxConversion = jest.fn();
  const mockInitiateCustomConversion = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
      build: mockBuild,
    }));

    mockUseNavigation.mockReturnValue({
      navigate: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      setParams: jest.fn(),
      dispatch: jest.fn(),
      isFocused: jest.fn().mockReturnValue(true),
      canGoBack: jest.fn().mockReturnValue(true),
      getParent: jest.fn(),
      getId: jest.fn(),
      getState: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseFocusEffect.mockImplementation((callback) => {
      callback();
    });
    mockSelectMusdQuickConvertEnabledFlag.mockReturnValue(true);
    mockUseMusdConversionTokens.mockReturnValue({
      tokens: [],
      filterAllowedTokens: jest.fn(),
      isConversionToken: jest.fn(),
      isMusdSupportedOnChain: jest.fn(),
      hasConvertibleTokensByChainId: jest.fn(),
    });
    mockUseMusdConversion.mockReturnValue({
      initiateMaxConversion: mockInitiateMaxConversion,
      initiateCustomConversion: mockInitiateCustomConversion,
      clearError: jest.fn(),
      error: null,
      hasSeenConversionEducationScreen: true,
    });
    mockUseMusdBalance.mockReturnValue({
      hasMusdBalanceOnAnyChain: false,
      hasMusdBalanceOnChain: jest.fn(),
      tokenBalanceByChain: {},
      fiatBalanceByChain: {},
      fiatBalanceFormattedByChain: {},
      tokenBalanceAggregated: '0',
      fiatBalanceAggregated: undefined,
      fiatBalanceAggregatedFormatted: '$0.00',
    });
    mockSelectHasInFlightMusdConversion.mockReturnValue(false);
    mockSelectHasUnapprovedMusdConversion.mockReturnValue(false);
    mockSelectMusdConversionStatuses.mockReturnValue({});
  });

  describe('navigation setup', () => {
    it('calls setOptions with getStakingNavbar when screen gains focus', () => {
      const mockSetOptions = jest.fn();
      mockUseNavigation.mockReturnValue({
        navigate: jest.fn(),
        goBack: jest.fn(),
        reset: jest.fn(),
        setParams: jest.fn(),
        dispatch: jest.fn(),
        isFocused: jest.fn().mockReturnValue(true),
        canGoBack: jest.fn().mockReturnValue(true),
        getParent: jest.fn(),
        getId: jest.fn(),
        getState: jest.fn(),
        setOptions: mockSetOptions,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      } as unknown as ReturnType<typeof useNavigation>);

      renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      expect(mockGetStakingNavbar).toHaveBeenCalledWith(
        '',
        expect.anything(),
        expect.anything(),
        { hasCancelButton: false },
      );
      expect(mockSetOptions).toHaveBeenCalled();
    });
  });

  describe('feature flag branching', () => {
    it('returns null when quick convert feature flag is disabled', () => {
      mockSelectMusdQuickConvertEnabledFlag.mockReturnValue(false);

      const { queryByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      expect(
        queryByTestId(MusdQuickConvertViewTestIds.CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('renders container when quick convert feature flag is enabled', () => {
      mockSelectMusdQuickConvertEnabledFlag.mockReturnValue(true);

      const { getByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      expect(
        getByTestId(MusdQuickConvertViewTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('empty state', () => {
    it('displays empty state when no tokens have balance', () => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });

      const { getByTestId, getByText } = renderWithProvider(
        <MusdQuickConvertView />,
        { state: initialRootState },
      );

      expect(
        getByTestId(MusdQuickConvertViewTestIds.EMPTY_STATE),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.no_tokens_to_convert')),
      ).toBeOnTheScreen();
    });

    it('displays empty state when tokens have zero rawBalance', () => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [
          createMockToken({ rawBalance: '0x0' as Hex }),
          createMockToken({ rawBalance: undefined }),
        ],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });

      const { getByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      expect(
        getByTestId(MusdQuickConvertViewTestIds.EMPTY_STATE),
      ).toBeOnTheScreen();
    });
  });

  describe('token list with balance', () => {
    it('renders token rows when tokens have balance', () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });

      const { getByTestId, getAllByTestId, getByText } = renderWithProvider(
        <MusdQuickConvertView />,
        { state: initialRootState },
      );

      expect(
        getByTestId(MusdQuickConvertViewTestIds.TOKEN_LIST),
      ).toBeOnTheScreen();
      expect(getAllByTestId(ConvertTokenRowTestIds.CONTAINER).length).toBe(1);
      expect(getByText(strings('earn.your_stablecoins'))).toBeOnTheScreen();
    });

    it('does not render Your mUSD section when user has no balance on any chain', () => {
      const { getByTestId, getByText, queryByText } = renderWithProvider(
        <MusdQuickConvertView />,
        { state: initialRootState },
      );

      expect(getByTestId(MusdQuickConvertViewTestIds.HEADER)).toBeOnTheScreen();
      expect(
        getByText(
          strings('earn.musd_conversion.quick_convert.title', {
            percentage: MUSD_CONVERSION_APY,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        queryByText(strings('earn.musd_conversion.your_musd')),
      ).not.toBeOnTheScreen();
    });

    it('renders Your mUSD section when user has balance on any chain', () => {
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        tokenBalanceByChain: { '0x1': '100.00' },
        fiatBalanceByChain: { '0x1': '100.00' },
        fiatBalanceFormattedByChain: { '0x1': '$100.00' },
        tokenBalanceAggregated: '100.00',
        fiatBalanceAggregated: '100.00',
        fiatBalanceAggregatedFormatted: '$100.00',
      });

      const { getByText } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      expect(
        getByText(strings('earn.musd_conversion.your_musd')),
      ).toBeOnTheScreen();
    });

    it('falls back to token balance when fiat balance is unavailable', () => {
      mockUseMusdBalance.mockReturnValue({
        hasMusdBalanceOnAnyChain: true,
        hasMusdBalanceOnChain: jest.fn(),
        tokenBalanceByChain: { '0x1': '123.45' },
        fiatBalanceByChain: {},
        fiatBalanceFormattedByChain: {},
        tokenBalanceAggregated: '123.45',
        fiatBalanceAggregated: undefined,
        fiatBalanceAggregatedFormatted: '$0.00',
      });

      const { getByText } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      expect(getByText('123.45')).toBeOnTheScreen();
    });
  });

  describe('Max flow', () => {
    it('calls initiateMaxConversion when Max button is pressed', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateMaxConversion.mockResolvedValue({
        transactionId: 'tx-max-123',
      });

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      const maxButton = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON)[0];

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(mockInitiateMaxConversion).toHaveBeenCalledWith(token);
    });
  });

  describe('Edit flow', () => {
    it('calls initiateCustomConversion when Edit button is pressed', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateCustomConversion.mockResolvedValue('tx-edit-789');

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      const editButton = getAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON)[0];

      await act(async () => {
        fireEvent.press(editButton);
      });

      expect(mockInitiateCustomConversion).toHaveBeenCalledWith({
        preferredPaymentToken: {
          address: token.address,
          chainId: token.chainId,
        },
        navigationOverride: MUSD_CONVERSION_NAVIGATION_OVERRIDE.CUSTOM,
      });
    });
  });

  describe('conversion pending state', () => {
    it('hides Max and Edit buttons when conversion is pending for token', () => {
      const token = createMockToken();
      const tokenChainKey = createTokenChainKey(
        token.address as string,
        token.chainId as string,
      );
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockSelectMusdConversionStatuses.mockReturnValue({
        [tokenChainKey]: {
          txId: 'tx-pending-1',
          status: TransactionStatus.submitted,
          isPending: true,
          isConfirmed: false,
          isFailed: false,
        },
      });

      const { queryAllByTestId } = renderWithProvider(
        <MusdQuickConvertView />,
        {
          state: initialRootState,
        },
      );

      expect(queryAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON).length).toBe(
        0,
      );
      expect(queryAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON).length).toBe(
        0,
      );
    });
  });

  describe('unapproved conversion', () => {
    it('does not call initiateMaxConversion or initiateCustomConversion when Max or Edit is pressed and hasUnapprovedMusdConversion is true', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockSelectHasUnapprovedMusdConversion.mockReturnValue(true);

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      const maxButton = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON)[0];
      const editButton = getAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON)[0];

      await act(async () => {
        fireEvent.press(maxButton);
      });
      expect(mockInitiateMaxConversion).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.press(editButton);
      });
      expect(mockInitiateCustomConversion).not.toHaveBeenCalled();
    });
  });

  describe('terms of use', () => {
    it('opens terms URL when terms apply text is pressed', () => {
      const { getByText } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      const termsApplyText = getByText(
        strings('earn.musd_conversion.education.terms_apply'),
      );

      act(() => {
        fireEvent.press(termsApplyText);
      });

      expect(Linking.openURL).toHaveBeenCalledWith(
        AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
      );
    });
  });

  describe('MetaMetrics', () => {
    it('tracks MUSD_BONUS_TERMS_OF_USE_PRESSED event when terms apply text is pressed', () => {
      const { getByText } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      const termsApplyText = getByText(
        strings('earn.musd_conversion.education.terms_apply'),
      );

      act(() => {
        fireEvent.press(termsApplyText);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_BONUS_TERMS_OF_USE_PRESSED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        location:
          MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.QUICK_CONVERT_HOME_SCREEN,
        url: AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE,
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('tracks MUSD_QUICK_CONVERT_SCREEN_VIEWED event on mount', () => {
      renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_QUICK_CONVERT_SCREEN_VIEWED,
      );
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('does not track MUSD_QUICK_CONVERT_SCREEN_VIEWED when feature flag is disabled', () => {
      mockSelectMusdQuickConvertEnabledFlag.mockReturnValue(false);

      renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_QUICK_CONVERT_SCREEN_VIEWED,
      );
    });

    it('tracks MUSD_QUICK_CONVERT_TOKEN_ROW_BUTTON_CLICKED event when Max button is pressed', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateMaxConversion.mockResolvedValue({
        transactionId: 'tx-max-123',
      });

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      const maxButton = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON)[0];

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_QUICK_CONVERT_TOKEN_ROW_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        location:
          MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.QUICK_CONVERT_HOME_SCREEN,
        button_type: 'text_button',
        button_action: 'max',
        button_text: strings('earn.musd_conversion.max'),
        redirects_to:
          MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS
            .QUICK_CONVERT_MAX_BOTTOM_SHEET_CONFIRMATION_SCREEN,
        asset_symbol: token.symbol,
        network_chain_id: token.chainId,
        network_name: 'Ethereum',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('tracks MUSD_QUICK_CONVERT_TOKEN_ROW_BUTTON_CLICKED event when Edit button is pressed', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateCustomConversion.mockResolvedValue('tx-edit-789');

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      mockTrackEvent.mockClear();
      mockCreateEventBuilder.mockClear();
      mockAddProperties.mockClear();
      mockBuild.mockClear();

      const editButton = getAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON)[0];

      await act(async () => {
        fireEvent.press(editButton);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_QUICK_CONVERT_TOKEN_ROW_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        location:
          MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.QUICK_CONVERT_HOME_SCREEN,
        button_type: 'icon_button',
        icon: IconName.Edit,
        button_action: 'custom',
        redirects_to:
          MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
        asset_symbol: token.symbol,
        network_chain_id: token.chainId,
        network_name: 'Ethereum',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });
  });
});
