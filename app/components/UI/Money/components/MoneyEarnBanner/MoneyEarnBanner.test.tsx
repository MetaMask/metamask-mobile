import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useDispatch, useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import MoneyEarnBanner from './MoneyEarnBanner';
import { MoneyEarnBannerTestIds } from './MoneyEarnBanner.testIds';
import { strings } from '../../../../../../locales/i18n';
import { setMoneyEarnBannerDismissed } from '../../../../../actions/user';
import { selectMoneyEarnBannerDismissedTokens } from '../../../../../reducers/user/selectors';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import { isSubsidizedRoute } from '../../../../Views/confirmations/utils/relayFixedSpread';
import Logger from '../../../../../util/Logger';
import { MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';
import { selectMoneyEnableMoneyAccountFlag } from '../../selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../../selectors/eligibility';
import { TokenI } from '../../../Tokens/types';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockUseDispatch = useDispatch as jest.Mock;

const mockDispatch = jest.fn();
const mockInitiateDeposit = jest.fn();
const mockUseMoneyAccountBalance = jest.fn();

jest.mock('../../hooks/useMoneyAccount', () => ({
  useMoneyAccountDeposit: () => ({
    initiateDeposit: mockInitiateDeposit,
  }),
}));

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: () => mockUseMoneyAccountBalance(),
}));

jest.mock('../../../../Views/confirmations/utils/relayFixedSpread', () => ({
  ...jest.requireActual(
    '../../../../Views/confirmations/utils/relayFixedSpread',
  ),
  isSubsidizedRoute: jest.fn(),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const mockIsSubsidizedRoute = isSubsidizedRoute as jest.Mock;

const MOCK_RELAY_CONFIG = { routes: [] };

const MOCK_USDC = {
  name: 'USD Coin',
  symbol: 'USDC',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
  image: 'https://example.com/usdc.png',
} as TokenI;

const MOCK_USDC_TOKEN_KEY = '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

interface SetupOptions {
  isMoneyAccountEnabled?: boolean;
  isGeoEligible?: boolean;
  dismissedTokens?: Record<string, boolean>;
  apyPercent?: number;
}

const setupDefaultMocks = ({
  isMoneyAccountEnabled = true,
  isGeoEligible = true,
  dismissedTokens = {},
  apyPercent,
}: SetupOptions = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectMoneyEnableMoneyAccountFlag) {
      return isMoneyAccountEnabled;
    }
    if (selector === selectIsMoneyAccountGeoEligible) return isGeoEligible;
    if (selector === selectRelayFixedSpread) return MOCK_RELAY_CONFIG;
    if (selector === selectMoneyEarnBannerDismissedTokens) {
      return dismissedTokens;
    }
    return undefined;
  });
  mockUseMoneyAccountBalance.mockReturnValue({ apyPercent });
};

describe('MoneyEarnBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockIsSubsidizedRoute.mockReturnValue(true);
    mockInitiateDeposit.mockResolvedValue(undefined);
    setupDefaultMocks();
  });

  describe('visibility gate', () => {
    it('renders the banner for a supported deposit source token', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.CONTAINER)).toBeOnTheScreen();
      expect(getByTestId(MoneyEarnBannerTestIds.TOKEN_ICON)).toBeOnTheScreen();
    });

    it('checks the relay route from the asset to mUSD on Monad', () => {
      render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(mockIsSubsidizedRoute).toHaveBeenCalledWith(
        MOCK_RELAY_CONFIG,
        { address: MOCK_USDC.address, chainId: '0x1' },
        { address: MUSD_TOKEN_ADDRESS, chainId: CHAIN_IDS.MONAD },
      );
    });

    it('renders nothing when the money account flag is disabled', () => {
      setupDefaultMocks({ isMoneyAccountEnabled: false });

      const { toJSON } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(toJSON()).toBeNull();
    });

    it('renders nothing when the user is not geo eligible', () => {
      setupDefaultMocks({ isGeoEligible: false });

      const { toJSON } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(toJSON()).toBeNull();
    });

    it('renders nothing when the token is not a supported deposit source', () => {
      mockIsSubsidizedRoute.mockReturnValue(false);

      const { toJSON } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(toJSON()).toBeNull();
    });

    it('renders nothing when the token has been dismissed', () => {
      setupDefaultMocks({
        dismissedTokens: { [MOCK_USDC_TOKEN_KEY]: true },
      });

      const { toJSON } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(toJSON()).toBeNull();
    });

    it('renders nothing when the asset has no address', () => {
      const asset = { ...MOCK_USDC, address: '' } as TokenI;

      const { toJSON } = render(<MoneyEarnBanner asset={asset} />);

      expect(toJSON()).toBeNull();
    });

    it('renders nothing when the asset has no chainId', () => {
      const asset = { ...MOCK_USDC, chainId: undefined } as TokenI;

      const { toJSON } = render(<MoneyEarnBanner asset={asset} />);

      expect(toJSON()).toBeNull();
    });
  });

  describe('content', () => {
    it('renders the title with the APY when apyPercent is positive', () => {
      setupDefaultMocks({ apyPercent: 5.2 });

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.TITLE)).toHaveTextContent(
        strings('money.earn_banner.title', { apy: 5.2 }),
      );
    });

    it('falls back to the no-APY title when apyPercent is unavailable', () => {
      setupDefaultMocks({ apyPercent: undefined });

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.TITLE)).toHaveTextContent(
        strings('money.earn_banner.title_no_apy'),
      );
    });

    it('renders the description with the token symbol', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.DESCRIPTION)).toHaveTextContent(
        strings('money.earn_banner.description', { symbol: 'USDC' }),
      );
    });

    it('renders the CTA with the token symbol', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      expect(getByTestId(MoneyEarnBannerTestIds.CTA)).toHaveTextContent(
        strings('money.earn_banner.cta', { symbol: 'USDC' }),
      );
    });

    it('canonicalises the registry MUSD symbol to the branded mUSD casing', () => {
      const asset = {
        ...MOCK_USDC,
        address: MUSD_TOKEN_ADDRESS,
        symbol: 'MUSD',
      } as TokenI;

      const { getByTestId } = render(<MoneyEarnBanner asset={asset} />);

      expect(getByTestId(MoneyEarnBannerTestIds.CTA)).toHaveTextContent(
        strings('money.earn_banner.cta', { symbol: 'mUSD' }),
      );
    });
  });

  describe('interactions', () => {
    it('initiates a deposit with the asset as preferred payment token when the card is pressed', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CONTAINER));

      expect(mockInitiateDeposit).toHaveBeenCalledTimes(1);
      expect(mockInitiateDeposit).toHaveBeenCalledWith({
        preferredPaymentToken: {
          address: MOCK_USDC.address,
          chainId: '0x1',
        },
      });
    });

    it('logs an error when initiating the deposit fails', async () => {
      const error = new Error('deposit failed');
      mockInitiateDeposit.mockRejectedValueOnce(error);

      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);
      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CONTAINER));

      await waitFor(() => {
        expect(Logger.error).toHaveBeenCalledWith(
          error,
          '[MoneyEarnBanner] Failed to initiate Money account deposit',
        );
      });
    });

    it('dispatches setMoneyEarnBannerDismissed with the token key when close is pressed', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CLOSE_BUTTON));

      expect(mockDispatch).toHaveBeenCalledWith(
        setMoneyEarnBannerDismissed(MOCK_USDC_TOKEN_KEY),
      );
    });

    it('does not initiate a deposit when close is pressed', () => {
      const { getByTestId } = render(<MoneyEarnBanner asset={MOCK_USDC} />);

      fireEvent.press(getByTestId(MoneyEarnBannerTestIds.CLOSE_BUTTON));

      expect(mockInitiateDeposit).not.toHaveBeenCalled();
    });
  });
});
