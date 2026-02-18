import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { TransactionStatus } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import MusdQuickConvertView from './index';
import { MusdQuickConvertViewTestIds } from './MusdQuickConvertView.types';
import { ConvertTokenRowTestIds } from '../../components/Musd/ConvertTokenRow/ConvertTokenRow.types';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../hooks/useMusdConversion';
import { selectMusdQuickConvertEnabledFlag } from '../../selectors/featureFlags';
import {
  createTokenChainKey,
  selectHasInFlightMusdConversion,
  selectMusdConversionStatuses,
} from '../../selectors/musdConversionStatus';
import { MUSD_CONVERSION_APY } from '../../constants/musd';
import Engine from '../../../../../core/Engine';
import AppConstants from '../../../../../core/AppConstants';
import { Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { MUSD_CONVERSION_NAVIGATION_OVERRIDE } from '../../types/musd.types';

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
jest.mock('../../selectors/featureFlags', () => ({
  ...jest.requireActual('../../selectors/featureFlags'),
  selectMusdQuickConvertEnabledFlag: jest.fn(),
}));
jest.mock('../../selectors/musdConversionStatus', () => ({
  ...jest.requireActual('../../selectors/musdConversionStatus'),
  selectHasInFlightMusdConversion: jest.fn(),
  selectMusdConversionStatuses: jest.fn(),
}));
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      subscribeOnceIf: jest.fn(),
    },
  },
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
const mockSelectHasInFlightMusdConversion =
  selectHasInFlightMusdConversion as jest.MockedFunction<
    typeof selectHasInFlightMusdConversion
  >;
const mockSelectMusdConversionStatuses =
  selectMusdConversionStatuses as jest.MockedFunction<
    typeof selectMusdConversionStatuses
  >;
const mockSubscribeOnceIf = Engine.controllerMessenger
  .subscribeOnceIf as jest.MockedFunction<
  typeof Engine.controllerMessenger.subscribeOnceIf
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
    mockSelectHasInFlightMusdConversion.mockReturnValue(false);
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

    it('renders header with title and mUSD balance section', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <MusdQuickConvertView />,
        { state: initialRootState },
      );

      expect(getByTestId(MusdQuickConvertViewTestIds.HEADER)).toBeOnTheScreen();
      expect(
        getByText(
          strings('earn.musd_conversion.quick_convert.title', {
            apy: MUSD_CONVERSION_APY,
          }),
        ),
      ).toBeOnTheScreen();
      expect(
        getByText(strings('earn.musd_conversion.your_musd')),
      ).toBeOnTheScreen();
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

    it('subscribes to failed tx when Max returns transactionId', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateMaxConversion.mockResolvedValue({
        transactionId: 'tx-max-456',
      });

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      const maxButton = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON)[0];

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(mockSubscribeOnceIf).toHaveBeenCalledWith(
        'TransactionController:transactionFailed',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('does not subscribe to failed tx when Max returns undefined transactionId', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateMaxConversion.mockResolvedValue({});

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      const maxButton = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON)[0];

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(mockSubscribeOnceIf).not.toHaveBeenCalled();
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

    it('subscribes to failed tx when Edit returns transactionId', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateCustomConversion.mockResolvedValue('tx-edit-999');

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      const editButton = getAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON)[0];

      await act(async () => {
        fireEvent.press(editButton);
      });

      expect(mockSubscribeOnceIf).toHaveBeenCalledWith(
        'TransactionController:transactionFailed',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('does not subscribe to failed tx when Edit returns undefined', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateCustomConversion.mockResolvedValue(undefined);

      const { getAllByTestId } = renderWithProvider(<MusdQuickConvertView />, {
        state: initialRootState,
      });

      const editButton = getAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON)[0];

      await act(async () => {
        fireEvent.press(editButton);
      });

      expect(mockSubscribeOnceIf).not.toHaveBeenCalled();
    });
  });

  describe('failure state', () => {
    it('displays inline failed message when tx fails and callback adds txId to failed keys', async () => {
      const token = createMockToken();
      const tokenChainKey = createTokenChainKey(
        token.address as string,
        token.chainId as string,
      );
      const txId = 'tx-failed-123';

      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateMaxConversion.mockResolvedValue({ transactionId: txId });
      mockSelectMusdConversionStatuses.mockReturnValue({
        [tokenChainKey]: {
          txId,
          status: TransactionStatus.failed,
          isPending: false,
          isConfirmed: false,
          isFailed: true,
        },
      });

      (mockSubscribeOnceIf as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const callback = args[1] as () => void;
          act(() => {
            callback();
          });
          return jest.fn();
        },
      );

      const { getAllByTestId, getByText } = renderWithProvider(
        <MusdQuickConvertView />,
        { state: initialRootState },
      );

      const maxButton = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON)[0];

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(
        getByText(
          strings('earn.musd_conversion.quick_convert.inline_failed_message'),
        ),
      ).toBeOnTheScreen();
    });

    it('clears failed conversion error when Edit is pressed after Max failure', async () => {
      const token = createMockToken();
      const tokenChainKey = createTokenChainKey(
        token.address as string,
        token.chainId as string,
      );
      const txId = 'tx-failed-edit-clear';

      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateMaxConversion.mockResolvedValueOnce({
        transactionId: txId,
      });
      mockInitiateCustomConversion.mockResolvedValueOnce('tx-edit-new');
      mockSelectMusdConversionStatuses.mockReturnValue({
        [tokenChainKey]: {
          txId,
          status: TransactionStatus.failed,
          isPending: false,
          isConfirmed: false,
          isFailed: true,
        },
      });

      (mockSubscribeOnceIf as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const callback = args[1] as () => void;
          act(() => {
            callback();
          });
          return jest.fn();
        },
      );

      const { getAllByTestId, getByText, queryByText } = renderWithProvider(
        <MusdQuickConvertView />,
        { state: initialRootState },
      );

      const maxButton = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON)[0];

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(
        getByText(
          strings('earn.musd_conversion.quick_convert.inline_failed_message'),
        ),
      ).toBeOnTheScreen();

      const editButton = getAllByTestId(ConvertTokenRowTestIds.EDIT_BUTTON)[0];

      await act(async () => {
        fireEvent.press(editButton);
      });

      expect(
        queryByText(
          strings('earn.musd_conversion.quick_convert.inline_failed_message'),
        ),
      ).not.toBeOnTheScreen();
    });

    it('clears failed conversion error when Max is pressed again after failure', async () => {
      const token = createMockToken();
      const tokenChainKey = createTokenChainKey(
        token.address as string,
        token.chainId as string,
      );
      const txId = 'tx-failed-clear';

      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockInitiateMaxConversion
        .mockResolvedValueOnce({ transactionId: txId })
        .mockResolvedValueOnce({ transactionId: 'tx-new-123' });
      mockSelectMusdConversionStatuses.mockReturnValue({
        [tokenChainKey]: {
          txId,
          status: TransactionStatus.failed,
          isPending: false,
          isConfirmed: false,
          isFailed: true,
        },
      });

      (mockSubscribeOnceIf as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const callback = args[1] as () => void;
          act(() => {
            callback();
          });
          return jest.fn();
        },
      );

      const { getAllByTestId, getByText, queryByText } = renderWithProvider(
        <MusdQuickConvertView />,
        { state: initialRootState },
      );

      const maxButton = getAllByTestId(ConvertTokenRowTestIds.MAX_BUTTON)[0];

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(
        getByText(
          strings('earn.musd_conversion.quick_convert.inline_failed_message'),
        ),
      ).toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(maxButton);
      });

      expect(
        queryByText(
          strings('earn.musd_conversion.quick_convert.inline_failed_message'),
        ),
      ).not.toBeOnTheScreen();
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

  describe('in-flight conversion', () => {
    it('does not call initiateMaxConversion or initiateCustomConversion when Max or Edit is pressed and hasInFlightMusdConversion is true', async () => {
      const token = createMockToken();
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [token],
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
        hasConvertibleTokensByChainId: jest.fn(),
      });
      mockSelectHasInFlightMusdConversion.mockReturnValue(true);

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
});
