import { act, waitFor } from '@testing-library/react-native';
import {
  fetchTokenAssets,
  type TokenSecurityData,
} from '@metamask/assets-controllers';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  initialState as bridgeInitialState,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';
import {
  SecurityDataType,
  type BridgeToken,
  type SecurityData,
} from '../../types';
import { useEnsureDestTokenSecurityData } from '.';

jest.mock('@metamask/assets-controllers', () => ({
  ...jest.requireActual('@metamask/assets-controllers'),
  fetchTokenAssets: jest.fn(),
}));

const mockFetchTokenAssets = jest.mocked(fetchTokenAssets);
type FetchTokenAssetsResult = Awaited<ReturnType<typeof fetchTokenAssets>>;

const MALICIOUS_TOKEN: BridgeToken = {
  address: '0x0cf8e180350253271f4b917ccfb0accc4862f262',
  chainId: '0x38',
  decimals: 18,
  symbol: 'BAD',
};

const OTHER_TOKEN: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x38',
  decimals: 18,
  symbol: 'OTHER',
};

const maliciousApiSecurityData = {
  resultType: 'Malicious',
  features: [
    { featureId: 'honeypot', type: 'Malicious', description: 'Honeypot' },
  ],
} as unknown as TokenSecurityData;

const maliciousAssets = [
  { securityData: maliciousApiSecurityData },
] as unknown as FetchTokenAssetsResult;

const renderWithDestToken = (destToken: BridgeToken | undefined) =>
  renderHookWithProvider(() => useEnsureDestTokenSecurityData(), {
    state: { bridge: { ...bridgeInitialState, destToken } },
  });

const deferredFetch = () => {
  let resolveFetch: (value: FetchTokenAssetsResult) => void = () => undefined;
  mockFetchTokenAssets.mockImplementationOnce(
    () =>
      new Promise<FetchTokenAssetsResult>((resolve) => {
        resolveFetch = resolve;
      }),
  );
  return (value: FetchTokenAssetsResult) => resolveFetch(value);
};

describe('useEnsureDestTokenSecurityData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and stores security data when the dest token has none', async () => {
    mockFetchTokenAssets.mockResolvedValue(maliciousAssets);

    const { store } = renderWithDestToken(MALICIOUS_TOKEN);

    await waitFor(() =>
      expect(store.getState().bridge.destToken?.securityData?.type).toBe(
        SecurityDataType.Malicious,
      ),
    );
    expect(mockFetchTokenAssets).toHaveBeenCalledWith(
      ['eip155:56/erc20:0x0cf8e180350253271f4b917ccfb0accc4862f262'],
      { includeTokenSecurityData: true },
    );
  });

  it('fetches when the dest token has security data without a type', async () => {
    mockFetchTokenAssets.mockResolvedValue(maliciousAssets);

    const { store } = renderWithDestToken({
      ...MALICIOUS_TOKEN,
      securityData: { metadata: { features: [] } } as unknown as SecurityData,
    });

    await waitFor(() =>
      expect(store.getState().bridge.destToken?.securityData?.type).toBe(
        SecurityDataType.Malicious,
      ),
    );
  });

  it('does not fetch when the dest token already has security data', () => {
    renderWithDestToken({
      ...MALICIOUS_TOKEN,
      securityData: { type: SecurityDataType.Malicious },
    });

    expect(mockFetchTokenAssets).not.toHaveBeenCalled();
  });

  it('discards the result when the dest token changed before the fetch resolved', async () => {
    const resolveFetch = deferredFetch();
    mockFetchTokenAssets.mockResolvedValue([]);
    const { store } = renderWithDestToken(MALICIOUS_TOKEN);

    act(() => {
      store.dispatch(setDestToken(OTHER_TOKEN));
    });
    await act(async () => {
      resolveFetch(maliciousAssets);
    });

    expect(store.getState().bridge.destToken).toEqual(OTHER_TOKEN);
  });

  it('refetches security data when the same token is set again without it', async () => {
    mockFetchTokenAssets.mockResolvedValue(maliciousAssets);
    const { store } = renderWithDestToken(MALICIOUS_TOKEN);
    await waitFor(() =>
      expect(store.getState().bridge.destToken?.securityData?.type).toBe(
        SecurityDataType.Malicious,
      ),
    );

    act(() => {
      store.dispatch(setDestToken(MALICIOUS_TOKEN));
    });

    await waitFor(() =>
      expect(store.getState().bridge.destToken?.securityData?.type).toBe(
        SecurityDataType.Malicious,
      ),
    );
    expect(mockFetchTokenAssets).toHaveBeenCalledTimes(2);
  });
});
