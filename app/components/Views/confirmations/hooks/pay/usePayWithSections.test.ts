import { renderHook } from '@testing-library/react-hooks';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { usePayWithCryptoSection } from './sections/usePayWithCryptoSection';
import { usePayWithSections } from './usePayWithSections';

jest.mock('./sections/usePayWithCryptoSection');

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

describe('usePayWithSections', () => {
  const usePayWithCryptoSectionMock = jest.mocked(usePayWithCryptoSection);

  beforeEach(() => {
    jest.resetAllMocks();

    usePayWithCryptoSectionMock.mockReturnValue(null);
  });

  it('returns empty sections array when no section is visible', () => {
    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([]);
  });

  it('returns the visible crypto section', () => {
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([CRYPTO_SECTION_MOCK]);
  });

  it('returns the same sections reference across renders', () => {
    const { result, rerender } = renderHook(() => usePayWithSections());
    const first = result.current.sections;

    rerender();

    expect(result.current.sections).toBe(first);
  });
});
