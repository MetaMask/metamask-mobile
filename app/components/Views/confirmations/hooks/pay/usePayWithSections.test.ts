import { renderHook } from '@testing-library/react-hooks';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { usePayWithCryptoSection } from './sections/usePayWithCryptoSection';
import { usePayWithFiatSection } from './sections/usePayWithFiatSection';
import { usePayWithMoneyAccountSection } from './sections/usePayWithMoneyAccountSection';
import { usePayWithPerpsSection } from './sections/usePayWithPerpsSection';
import { usePayWithPredictSection } from './sections/usePayWithPredictSection';
import { usePayWithSections } from './usePayWithSections';

jest.mock('./sections/usePayWithCryptoSection');
jest.mock('./sections/usePayWithFiatSection');
jest.mock('./sections/usePayWithMoneyAccountSection');
jest.mock('./sections/usePayWithPerpsSection');
jest.mock('./sections/usePayWithPredictSection');

const CRYPTO_SECTION_MOCK: PayWithSectionConfig = {
  id: 'crypto',
  title: 'Crypto',
  rows: [
    {
      id: 'crypto-preferred-token',
      icon: 'USDC',
      title: 'USDC',
    },
  ],
};

const PERPS_SECTION_MOCK: PayWithSectionConfig = {
  id: 'perps',
  title: 'Perps',
  rows: [
    {
      id: 'perps-balance',
      icon: 'Perps',
      title: 'Perps account',
    },
  ],
};

const PREDICT_SECTION_MOCK: PayWithSectionConfig = {
  id: 'predict',
  title: 'Predict',
  rows: [
    {
      id: 'predict-balance',
      icon: 'Predict',
      title: 'Predict account',
    },
  ],
};

const MONEY_ACCOUNT_SECTION_MOCK: PayWithSectionConfig = {
  id: 'money-account',
  title: 'Money account',
  rows: [
    {
      id: 'money-account-musd',
      icon: 'mUSD',
      title: 'mUSD',
    },
  ],
};

const BANK_CARD_SECTION_MOCK: PayWithSectionConfig = {
  id: 'bank-card',
  title: 'Bank and card',
  rows: [
    {
      id: 'pay-with-fiat-debit-credit-card',
      icon: 'card',
      title: 'Credit Card',
    },
  ],
};

describe('usePayWithSections', () => {
  const usePayWithCryptoSectionMock = jest.mocked(usePayWithCryptoSection);
  const usePayWithFiatSectionMock = jest.mocked(usePayWithFiatSection);
  const usePayWithMoneyAccountSectionMock = jest.mocked(
    usePayWithMoneyAccountSection,
  );
  const usePayWithPerpsSectionMock = jest.mocked(usePayWithPerpsSection);
  const usePayWithPredictSectionMock = jest.mocked(usePayWithPredictSection);

  beforeEach(() => {
    jest.resetAllMocks();

    usePayWithCryptoSectionMock.mockReturnValue(null);
    usePayWithFiatSectionMock.mockReturnValue(null);
    usePayWithMoneyAccountSectionMock.mockReturnValue(null);
    usePayWithPerpsSectionMock.mockReturnValue(null);
    usePayWithPredictSectionMock.mockReturnValue(null);
  });

  it('returns empty sections array when no section is visible', () => {
    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([]);
  });

  it('returns the visible crypto section when only crypto is available', () => {
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([CRYPTO_SECTION_MOCK]);
  });

  it('returns the visible perps section', () => {
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([PERPS_SECTION_MOCK]);
  });

  it('returns the visible predict section', () => {
    usePayWithPredictSectionMock.mockReturnValue(PREDICT_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([PREDICT_SECTION_MOCK]);
  });

  it('returns the visible bank-card section when only bank-card is available', () => {
    usePayWithFiatSectionMock.mockReturnValue(BANK_CARD_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([BANK_CARD_SECTION_MOCK]);
  });

  it('returns perps section before crypto section when both are visible', () => {
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([
      PERPS_SECTION_MOCK,
      CRYPTO_SECTION_MOCK,
    ]);
  });

  it('renders bank-card before crypto when both sections are visible', () => {
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);
    usePayWithFiatSectionMock.mockReturnValue(BANK_CARD_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([
      BANK_CARD_SECTION_MOCK,
      CRYPTO_SECTION_MOCK,
    ]);
  });

  it('returns the visible money-account section when only money-account is available', () => {
    usePayWithMoneyAccountSectionMock.mockReturnValue(
      MONEY_ACCOUNT_SECTION_MOCK,
    );

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([MONEY_ACCOUNT_SECTION_MOCK]);
  });

  it('renders money-account before perps when both are visible', () => {
    usePayWithMoneyAccountSectionMock.mockReturnValue(
      MONEY_ACCOUNT_SECTION_MOCK,
    );
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([
      MONEY_ACCOUNT_SECTION_MOCK,
      PERPS_SECTION_MOCK,
    ]);
  });

  it('orders sections [perps, predict, bank-card, crypto] when predict and perps are visible', () => {
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);
    usePayWithFiatSectionMock.mockReturnValue(BANK_CARD_SECTION_MOCK);
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);
    usePayWithPredictSectionMock.mockReturnValue(PREDICT_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([
      PERPS_SECTION_MOCK,
      PREDICT_SECTION_MOCK,
      BANK_CARD_SECTION_MOCK,
      CRYPTO_SECTION_MOCK,
    ]);
  });

  it('renders money-account, perps, bank-card, then crypto when all four sections are visible (no predict)', () => {
    usePayWithMoneyAccountSectionMock.mockReturnValue(
      MONEY_ACCOUNT_SECTION_MOCK,
    );
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);
    usePayWithFiatSectionMock.mockReturnValue(BANK_CARD_SECTION_MOCK);
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([
      MONEY_ACCOUNT_SECTION_MOCK,
      PERPS_SECTION_MOCK,
      BANK_CARD_SECTION_MOCK,
      CRYPTO_SECTION_MOCK,
    ]);
  });

  it('orders all five sections [money-account, perps, predict, bank-card, crypto]', () => {
    usePayWithMoneyAccountSectionMock.mockReturnValue(
      MONEY_ACCOUNT_SECTION_MOCK,
    );
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);
    usePayWithFiatSectionMock.mockReturnValue(BANK_CARD_SECTION_MOCK);
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);
    usePayWithPredictSectionMock.mockReturnValue(PREDICT_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([
      MONEY_ACCOUNT_SECTION_MOCK,
      PERPS_SECTION_MOCK,
      PREDICT_SECTION_MOCK,
      BANK_CARD_SECTION_MOCK,
      CRYPTO_SECTION_MOCK,
    ]);
  });

  it('returns the same sections reference across renders', () => {
    const { result, rerender } = renderHook(() => usePayWithSections());
    const first = result.current.sections;

    rerender();

    expect(result.current.sections).toBe(first);
  });
});
