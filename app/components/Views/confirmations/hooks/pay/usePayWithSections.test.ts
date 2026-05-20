import { renderHook } from '@testing-library/react-hooks';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { usePayWithCryptoSection } from './sections/usePayWithCryptoSection';
import { usePayWithFiatSection } from './sections/usePayWithFiatSection';
import { usePayWithSections } from './usePayWithSections';

jest.mock('./sections/usePayWithCryptoSection');
jest.mock('./sections/usePayWithFiatSection');

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

  beforeEach(() => {
    jest.resetAllMocks();

    usePayWithCryptoSectionMock.mockReturnValue(null);
    usePayWithFiatSectionMock.mockReturnValue(null);
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

  it('returns the visible bank-card section when only bank-card is available', () => {
    usePayWithFiatSectionMock.mockReturnValue(BANK_CARD_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([BANK_CARD_SECTION_MOCK]);
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

  it('returns the same sections reference across renders', () => {
    const { result, rerender } = renderHook(() => usePayWithSections());
    const first = result.current.sections;

    rerender();

    expect(result.current.sections).toBe(first);
  });
});
