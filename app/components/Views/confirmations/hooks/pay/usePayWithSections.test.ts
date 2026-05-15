import { renderHook } from '@testing-library/react-hooks';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { usePayWithCryptoSection } from './sections/usePayWithCryptoSection';
import { usePayWithPerpsSection } from './sections/usePayWithPerpsSection';
import { usePayWithPredictSection } from './sections/usePayWithPredictSection';
import { usePayWithSections } from './usePayWithSections';

jest.mock('./sections/usePayWithCryptoSection');
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

describe('usePayWithSections', () => {
  const usePayWithCryptoSectionMock = jest.mocked(usePayWithCryptoSection);
  const usePayWithPerpsSectionMock = jest.mocked(usePayWithPerpsSection);
  const usePayWithPredictSectionMock = jest.mocked(usePayWithPredictSection);

  beforeEach(() => {
    jest.resetAllMocks();

    usePayWithCryptoSectionMock.mockReturnValue(null);
    usePayWithPerpsSectionMock.mockReturnValue(null);
    usePayWithPredictSectionMock.mockReturnValue(null);
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

  it('returns the visible perps section', () => {
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([PERPS_SECTION_MOCK]);
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

  it('returns the visible predict section', () => {
    usePayWithPredictSectionMock.mockReturnValue(PREDICT_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([PREDICT_SECTION_MOCK]);
  });

  it('orders sections [perps, predict, crypto] when all three are visible', () => {
    usePayWithCryptoSectionMock.mockReturnValue(CRYPTO_SECTION_MOCK);
    usePayWithPerpsSectionMock.mockReturnValue(PERPS_SECTION_MOCK);
    usePayWithPredictSectionMock.mockReturnValue(PREDICT_SECTION_MOCK);

    const { result } = renderHook(() => usePayWithSections());

    expect(result.current.sections).toEqual([
      PERPS_SECTION_MOCK,
      PREDICT_SECTION_MOCK,
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
