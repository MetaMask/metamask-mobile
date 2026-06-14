import { renderHook } from '@testing-library/react-hooks';
import { useAddressPoisoningDetection } from './useAddressPoisoningDetection';
import Engine from '../../../../../core/Engine';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PhishingController: {
      checkAddressPoisoning: jest.fn(),
    },
  },
}));

const mockCheckAddressPoisoning = Engine.context.PhishingController
  .checkAddressPoisoning as jest.MockedFunction<
  typeof Engine.context.PhishingController.checkAddressPoisoning
>;

describe('useAddressPoisoningDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns no suspect when toAddress is undefined', () => {
    const { result } = renderHook(() =>
      useAddressPoisoningDetection(undefined),
    );

    expect(result.current.isPoisoningSuspect).toBe(false);
    expect(result.current.bestMatch).toBeNull();
    expect(result.current.matches).toHaveLength(0);
    expect(mockCheckAddressPoisoning).not.toHaveBeenCalled();
  });

  it('detects poisoning suspect when controller returns matches', () => {
    const mockMatch = {
      knownAddress: '0xknown1',
      prefixMatchLength: 6,
      suffixMatchLength: 6,
      poisoningScore: 8,
      diffIndices: [10, 11, 12],
    };
    mockCheckAddressPoisoning.mockReturnValue([mockMatch]);

    const { result } = renderHook(() =>
      useAddressPoisoningDetection('0xcandidate'),
    );

    expect(result.current.isPoisoningSuspect).toBe(true);
    expect(result.current.bestMatch).toEqual(mockMatch);
    expect(result.current.matches).toHaveLength(1);
  });

  it('returns no suspect when no similar addresses found', () => {
    mockCheckAddressPoisoning.mockReturnValue([]);

    const { result } = renderHook(() =>
      useAddressPoisoningDetection('0xcompletely_different'),
    );

    expect(result.current.isPoisoningSuspect).toBe(false);
    expect(result.current.bestMatch).toBeNull();
  });

  it('calls checkAddressPoisoning with the candidate address', () => {
    mockCheckAddressPoisoning.mockReturnValue([]);

    renderHook(() => useAddressPoisoningDetection('0xcandidate'));

    expect(mockCheckAddressPoisoning).toHaveBeenCalledWith('0xcandidate');
  });
});
