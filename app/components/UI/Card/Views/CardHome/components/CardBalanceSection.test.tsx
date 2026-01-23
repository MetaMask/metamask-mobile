import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardBalanceSection from './CardBalanceSection';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { CardHomeSelectors } from '../CardHome.testIds';
import type { CardAssetBalance } from '../CardHome.types';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_RATE_UNDEFINED,
} from '../../../../Tokens/constants';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'card.card_home.available_balance': 'Available Balance',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock('../../../components/CardAssetItem', () => {
  const { View } = jest.requireActual('react-native');
  return jest
    .fn()
    .mockImplementation(() =>
      jest
        .requireActual('react')
        .createElement(View, { testID: 'card-asset-item' }),
    );
});

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardBalanceSection',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

const createAssetBalance = (
  overrides: Partial<CardAssetBalance> = {},
): CardAssetBalance => ({
  asset: {
    address: '0x123',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    image: '',
    aggregators: [],
    balance: '100000000',
    logo: undefined,
    isETH: false,
  },
  balanceFiat: '$100.00',
  balanceFormatted: '100 USDC',
  rawFiatNumber: 100,
  rawTokenBalance: 100,
  ...overrides,
});

describe('CardBalanceSection', () => {
  const mockOnTogglePrivacyMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders balance and controls when visible (not setup/KYC pending)', () => {
      const assetBalance = createAssetBalance();

      const { getByText, getByTestId } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading={false}
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      expect(getByText('$100.00')).toBeOnTheScreen();
      expect(getByText('Available Balance')).toBeOnTheScreen();
      expect(
        getByTestId(CardHomeSelectors.PRIVACY_TOGGLE_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('loading state', () => {
    it('renders balance skeleton when isLoading is true', () => {
      const assetBalance = createAssetBalance();

      const { getByTestId } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      expect(getByTestId(CardHomeSelectors.BALANCE_SKELETON)).toBeOnTheScreen();
    });

    it('renders asset item skeleton when isLoading is true', () => {
      const assetBalance = createAssetBalance();

      const { getByTestId } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      expect(
        getByTestId(CardHomeSelectors.CARD_ASSET_ITEM_SKELETON),
      ).toBeOnTheScreen();
    });

    it('renders balance skeleton when balanceAmount is TOKEN_BALANCE_LOADING', () => {
      const assetBalance = createAssetBalance({
        balanceFiat: TOKEN_BALANCE_LOADING,
      });

      const { getByTestId } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading={false}
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      expect(getByTestId(CardHomeSelectors.BALANCE_SKELETON)).toBeOnTheScreen();
    });
  });

  describe('balance display', () => {
    it('displays fiat balance when available', () => {
      const assetBalance = createAssetBalance({ balanceFiat: '$250.00' });

      const { getByText } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading={false}
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      expect(getByText('$250.00')).toBeOnTheScreen();
    });

    it('displays formatted balance when fiat is TOKEN_RATE_UNDEFINED', () => {
      const assetBalance = createAssetBalance({
        balanceFiat: TOKEN_RATE_UNDEFINED,
        balanceFormatted: '100 USDC',
      });

      const { getByText } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading={false}
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      expect(getByText('100 USDC')).toBeOnTheScreen();
    });

    it('displays "0" when assetBalance is null', () => {
      const { getByText } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading={false}
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={null}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      expect(getByText('0')).toBeOnTheScreen();
    });
  });

  describe('privacy mode', () => {
    it('calls onTogglePrivacyMode with true when privacy is off and button is pressed', () => {
      const assetBalance = createAssetBalance();

      const { getByTestId } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading={false}
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.PRIVACY_TOGGLE_BUTTON));

      expect(mockOnTogglePrivacyMode).toHaveBeenCalledWith(true);
    });

    it('calls onTogglePrivacyMode with false when privacy is on and button is pressed', () => {
      const assetBalance = createAssetBalance();

      const { getByTestId } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading={false}
          needsSetup={false}
          isKYCPending={false}
          privacyMode
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.PRIVACY_TOGGLE_BUTTON));

      expect(mockOnTogglePrivacyMode).toHaveBeenCalledWith(false);
    });
  });

  describe('asset display', () => {
    it('renders CardAssetItem when not loading', () => {
      const assetBalance = createAssetBalance();

      const { getByTestId } = renderWithProvider(() => (
        <CardBalanceSection
          isLoading={false}
          needsSetup={false}
          isKYCPending={false}
          privacyMode={false}
          assetBalance={assetBalance}
          onTogglePrivacyMode={mockOnTogglePrivacyMode}
        />
      ));

      expect(getByTestId('card-asset-item')).toBeOnTheScreen();
    });
  });
});
