/**
 * MeldProvider — React Context that replaces the RampSDKProvider
 *
 * Instead of wrapping on-ramp-sdk, this context manages
 * Meld API state directly: selected country, fiat, crypto, payment method.
 *
 * This is the PoC equivalent of Aggregator/sdk/index.tsx
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  MeldCountry,
  MeldCryptoCurrency,
  MeldFiatCurrency,
  MeldPaymentMethodType,
} from './types';

export interface MeldContextValue {
  // Selected values
  selectedCountry: MeldCountry | null;
  setSelectedCountry: (country: MeldCountry | null) => void;

  selectedFiatCurrency: MeldFiatCurrency | null;
  setSelectedFiatCurrency: (fiat: MeldFiatCurrency | null) => void;

  selectedCrypto: MeldCryptoCurrency | null;
  setSelectedCrypto: (crypto: MeldCryptoCurrency | null) => void;

  selectedPaymentMethod: MeldPaymentMethodType | null;
  setSelectedPaymentMethod: (method: MeldPaymentMethodType | null) => void;

  walletAddress: string;
  setWalletAddress: (addr: string) => void;

  // Buy / Sell toggle
  isBuy: boolean;
  setIsBuy: (isBuy: boolean) => void;
}

const MeldContext = createContext<MeldContextValue | undefined>(undefined);

interface Props {
  children: React.ReactNode;
  initialWalletAddress?: string;
}

export const MeldSDKProvider: React.FC<Props> = ({
  children,
  initialWalletAddress = '',
}) => {
  const [selectedCountry, _setCountry] = useState<MeldCountry | null>(null);
  const [selectedFiatCurrency, _setFiat] = useState<MeldFiatCurrency | null>(
    null,
  );
  const [selectedCrypto, _setCrypto] = useState<MeldCryptoCurrency | null>(
    null,
  );
  const [selectedPaymentMethod, _setPayment] =
    useState<MeldPaymentMethodType | null>(null);
  const [walletAddress, _setWallet] = useState(initialWalletAddress);
  const [isBuy, _setIsBuy] = useState(true);

  const setSelectedCountry = useCallback(
    (c: MeldCountry | null) => _setCountry(c),
    [],
  );
  const setSelectedFiatCurrency = useCallback(
    (f: MeldFiatCurrency | null) => _setFiat(f),
    [],
  );
  const setSelectedCrypto = useCallback(
    (c: MeldCryptoCurrency | null) => _setCrypto(c),
    [],
  );
  const setSelectedPaymentMethod = useCallback(
    (m: MeldPaymentMethodType | null) => _setPayment(m),
    [],
  );
  const setWalletAddress = useCallback((a: string) => _setWallet(a), []);
  const setIsBuy = useCallback((b: boolean) => _setIsBuy(b), []);

  const value = useMemo(
    (): MeldContextValue => ({
      selectedCountry,
      setSelectedCountry,
      selectedFiatCurrency,
      setSelectedFiatCurrency,
      selectedCrypto,
      setSelectedCrypto,
      selectedPaymentMethod,
      setSelectedPaymentMethod,
      walletAddress,
      setWalletAddress,
      isBuy,
      setIsBuy,
    }),
    [
      selectedCountry,
      setSelectedCountry,
      selectedFiatCurrency,
      setSelectedFiatCurrency,
      selectedCrypto,
      setSelectedCrypto,
      selectedPaymentMethod,
      setSelectedPaymentMethod,
      walletAddress,
      setWalletAddress,
      isBuy,
      setIsBuy,
    ],
  );

  return <MeldContext.Provider value={value}>{children}</MeldContext.Provider>;
};

export const useMeldContext = (): MeldContextValue => {
  const ctx = useContext(MeldContext);
  if (!ctx) {
    throw new Error('useMeldContext must be used within a MeldSDKProvider');
  }
  return ctx;
};

export default MeldContext;
