jest.mock('../../framework/ChromeCdpHelpers', () => ({
  __esModule: true,
  default: {
    evaluateInWebView: jest.fn(),
    readTextByIdInWebView: jest.fn(),
  },
}));

jest.mock('../../helpers/multichain/MultichainUtilities', () => ({
  __esModule: true,
  default: {
    CHAIN_IDS: {
      ETHEREUM_MAINNET: '1',
      LINEA_MAINNET: '59144',
      ARBITRUM_ONE: '42161',
      AVALANCHE: '43114',
      OPTIMISM: '10',
      POLYGON: '137',
      ZKSYNC_ERA: '324',
      BASE: '8453',
      BSC: '56',
      LOCALHOST: '1337',
    },
  },
}));

jest.mock('../../framework/logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    warn: jest.fn(),
  }),
}));

import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers';
import { clearSessionResult } from './MultichainTestDAppNetworkSelection';

const mockedEvaluate = jest.mocked(ChromeCdpHelpers.evaluateInWebView);
const mockedReadText = jest.mocked(ChromeCdpHelpers.readTextByIdInWebView);

describe('clearSessionResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEvaluate.mockResolvedValue(true);
  });

  it('waits until the previous session result is empty', async () => {
    mockedReadText
      .mockResolvedValueOnce('{"sessionScopes":{"eip155:1":{}}}')
      .mockResolvedValueOnce(null);

    await expect(clearSessionResult()).resolves.toBeUndefined();

    expect(mockedReadText).toHaveBeenCalledTimes(2);
  });

  it('fails when the WebView clear operation was not executed', async () => {
    mockedEvaluate.mockResolvedValue(null);

    await expect(clearSessionResult()).rejects.toThrow(
      'Could not clear #session-method-result-0',
    );
    expect(mockedReadText).not.toHaveBeenCalled();
  });
});
