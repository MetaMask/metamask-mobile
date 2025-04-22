import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useRegions from './useRegions';
import useSDKMethod from './useSDKMethod';
import { RampSDK } from '../sdk';

type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};

const mockUseRampSDKInitialValues: DeepPartial<RampSDK> = {
  selectedRegion: { id: 'test-region-id', unsupported: false },
  setSelectedRegion: jest.fn(),
  unsupportedRegion: undefined,
  setUnsupportedRegion: jest.fn(),
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

  const renderHookWithMockedNavigation = (hook: () => any) =>
    renderHookWithProvider(() => hook());

  it('calls useSDKMethod with the correct parameters', () => {
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);
    renderHookWithMockedNavigation(() => useRegions());

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
    const { result } = renderHookWithMockedNavigation(() => useRegions());

    expect(result.current).toEqual({
      data: null,
      isFetching: true,
      isDetecting: false,
      error: null,
      query: mockQueryGetCountries,
      selectedRegion: { id: 'test-region-id', unsupported: false },
      unsupportedRegion: undefined,
      clearUnsupportedRegion: expect.any(Function),
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
    const { result } = renderHookWithMockedNavigation(() => useRegions());

    expect(result.current).toEqual({
      data: null,
      isFetching: false,
      isDetecting: false,
      error: 'error-fetching-regions',
      query: mockQueryGetCountries,
      selectedRegion: { id: 'test-region-id', unsupported: false },
      unsupportedRegion: undefined,
      clearUnsupportedRegion: expect.any(Function),
    });
  });

  it('sets the selected region if a detected region is found', () => {
    const mockQueryGetCountries = jest.fn();
    mockUseRampSDKValues.selectedRegion = undefined;
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { id: 'detected-1', detected: true },
          { id: 'region-2', detected: false },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCountries,
    ]);
    renderHookWithMockedNavigation(() => useRegions());

    expect(mockUseRampSDKValues.setSelectedRegion).toHaveBeenCalledWith({
      id: 'detected-1',
      detected: true,
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
              { id: 'state-1', detected: false },
              { id: 'state-2', detected: true },
            ],
          },
          { id: 'region-2', detected: false },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCountries,
    ]);
    renderHookWithMockedNavigation(() => useRegions());

    expect(mockUseRampSDKValues.setSelectedRegion).toHaveBeenCalledWith({
      id: 'state-2',
      detected: true,
    });
  });

  it('sets the unsupported region if the selected region is unsupported', () => {
    mockUseRampSDKValues.selectedRegion = {
      id: 'unsupported-region',
      unsupported: true,
    };
    const mockQueryGetCountries = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          { id: 'unsupported-region', unsupported: true },
          { id: 'region-2', unsupported: false },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCountries,
    ]);
    renderHookWithMockedNavigation(() => useRegions());

    expect(mockUseRampSDKValues.setSelectedRegion).toHaveBeenCalledWith(null);
    expect(mockUseRampSDKValues.setUnsupportedRegion).toHaveBeenCalledWith({
      id: 'unsupported-region',
      unsupported: true,
    });
  });

  it('updates the selected region and handles unsupported regions based on sell support', () => {
    mockUseRampSDKValues.isBuy = false;
    mockUseRampSDKValues.isSell = true;
    mockUseRampSDKValues.selectedRegion = {
      id: 'unsupported-sell-region',
      unsupported: false,
    };
    const mockQueryGetCountries = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          {
            id: 'unsupported-sell-region',
            support: { sell: false, buy: true },
          },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCountries,
    ]);
    renderHookWithMockedNavigation(() => useRegions());

    expect(mockUseRampSDKValues.setUnsupportedRegion).toHaveBeenCalledWith({
      id: 'unsupported-sell-region',
      support: { buy: true, sell: false },
    });
  });

  it('updates the selected region and handles unsupported regions based on buy support', () => {
    mockUseRampSDKValues.isBuy = true;
    mockUseRampSDKValues.isSell = false;
    mockUseRampSDKValues.selectedRegion = {
      id: 'unsupported-buy-region',
      unsupported: false,
    };
    const mockQueryGetCountries = jest.fn();
    (useSDKMethod as jest.Mock).mockReturnValue([
      {
        data: [
          {
            id: 'unsupported-buy-region',
            support: { sell: true, buy: false },
          },
        ],
        error: null,
        isFetching: false,
      },
      mockQueryGetCountries,
    ]);
    renderHookWithMockedNavigation(() => useRegions());

    expect(mockUseRampSDKValues.setUnsupportedRegion).toHaveBeenCalledWith({
      id: 'unsupported-buy-region',
      support: { buy: false, sell: true },
    });
  });
});
