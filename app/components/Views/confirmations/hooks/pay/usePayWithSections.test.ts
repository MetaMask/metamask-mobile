import { renderHook } from '@testing-library/react-hooks';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { usePayWithCryptoSection } from './sections/usePayWithCryptoSection';
import { usePayWithFiatSection } from './sections/usePayWithFiatSection';
import { usePayWithPerpsSection } from './sections/usePayWithPerpsSection';
import { usePayWithSections } from './usePayWithSections';

jest.mock('./sections/usePayWithCryptoSection');
jest.mock('./sections/usePayWithFiatSection');
jest.mock('./sections/usePayWithPerpsSection');

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
  const usePayWithPerpsSectionMock = jest.mocked(usePayWithPerpsSection);

  beforeEach(() => {
    jest.resetAllMocks();

    usePayWithCryptoSectionMock.mockReturnValue(null);
    usePayWithFiatSectionMock.mockReturnValue(null);
    usePayWithPerpsSectionMock.mockReturnValue(null);
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

  it('renders perps, bank-card, then crypto when all three sections are visible', () => {
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);
    usePayWithFiatSectionMock.mockReturnValue(BANK_CARD_SECTION_MOCK);
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([
      PERPS_SECTION_MOCK,
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
