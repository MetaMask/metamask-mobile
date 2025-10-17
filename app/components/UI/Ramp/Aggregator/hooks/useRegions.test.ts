import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import useRegions from './useRegions';
import useSDKMethod from './useSDKMethod';
import { RampSDK } from '../sdk';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockUseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedRegion: {
    id: 'test-region-id',
    unsupported: false,
    support: { buy: true, sell: true },
  },
  setSelectedRegion: jest.fn(),
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: DeepPartial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../sdk', () => ({
  useRampSDK: () => mockUseRampSDKValues,
}));

jest.mock('./useSDKMethod');

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    reset: jest.fn(),
    setOptions: jest.fn(),
  })),
  useRoute: jest.fn(() => ({
    name: 'MockRouteName',
  })),
}));

describe('useRegions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
  });

  it('calls useSDKMethod with the correct parameters', () => {
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    renderHookWithProvider(() => useRegions());

    expect(useSDKMethod).toHaveBeenCalledWith('getCountries');
  });

  it('returns loading state if fetching regions', () => {
    const mockQueryGetCountries = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: null,
        error: null,
        isFetching: true,
      },
      mockQueryGetCountries,
    ]);
    const { result } = renderHookWithProvider(() => useRegions());

    expect(result.current).toEqual({
      data: null,
      isFetching: true,
      error: null,
      query: mockQueryGetCountries,
      selectedRegion: {
        id: 'test-region-id',
        unsupported: false,
        support: { sell: true, buy: true },
      },
    });
  });

  it('returns error state if there is an error fetching regions', () => {
    const mockQueryGetCountries = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: null,
        error: 'error-fetching-regions',
        isFetching: false,
      },
      mockQueryGetCountries,
    ]);
    const { result } = renderHookWithProvider(() => useRegions());

    expect(result.current).toEqual({
      data: null,
      isFetching: false,
      error: 'error-fetching-regions',
      query: mockQueryGetCountries,
      selectedRegion: {
        id: 'test-region-id',
        unsupported: false,
        support: { sell: true, buy: true },
      },
    });
  });

  it('sets the selected region if a detected region is found', () => {
    const mockQueryGetCountries = jest.fn();
    mockUseRampSDKValues.selectedRegion = undefined;
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          {
            id: 'detected-1',
            detected: true,
            support: { buy: true, sell: true },
          },
          {
            id: 'region-2',
            detected: false,
            support: { buy: true, sell: true },
          },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCountries,
    ]);
    renderHookWithProvider(() => useRegions());

    expect(mockUseRampSDKValues.setSelectedRegion).toHaveBeenCalledWith({
      id: 'detected-1',
      detected: true,
      support: { buy: true, sell: true },
    });
  });

  it('sets the selected region if a detected state is found within a country', () => {
    const mockQueryGetCountries = jest.fn();
    mockUseRampSDKValues.selectedRegion = undefined;
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          {
            id: 'country-1',
            detected: true,
            states: [
              {
                id: 'state-1',
                detected: false,
                support: { buy: true, sell: true },
              },
              {
                id: 'state-2',
                detected: true,
                support: { buy: true, sell: true },
              },
            ],
            support: { buy: true, sell: true },
          },
          { id: 'region-2', detected: false },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCountries,
    ]);
    renderHookWithProvider(() => useRegions());

    expect(mockUseRampSDKValues.setSelectedRegion).toHaveBeenCalledWith({
      id: 'state-2',
      detected: true,
      support: { buy: true, sell: true },
    });
  });
});
