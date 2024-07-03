import React from 'react';
import { type TokenListToken } from '@metamask/assets-controllers';
import { selectChainId } from '../../../selectors/networkController';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectTokenListArray } from '../../../selectors/tokenListController';
import { isMainnetByChainId } from '../../../util/networks';

import useTokenList from './useTokenList';

const MAINNET_TOKEN_ADDRESS_MOCK = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const MAINNET_TOKEN_NAME_MOCK = 'Tether USD';
const normalizedMainnetTokenListMock = [
  {
    name: MAINNET_TOKEN_NAME_MOCK,
  },
];
jest.mock('@metamask/contract-metadata', () => ({
  __esModule: true,
  default: {
    [MAINNET_TOKEN_ADDRESS_MOCK]: {
      name: MAINNET_TOKEN_NAME_MOCK,
    },
  },
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectChainId: jest.fn(),
}));

jest.mock('../../../selectors/preferencesController', () => ({
  selectUseTokenDetection: jest.fn(),
}));

jest.mock('../../../selectors/tokenListController', () => ({
  selectTokenListArray: jest.fn(),
}));

jest.mock('../../../util/networks', () => ({
  isMainnetByChainId: jest.fn(),
}));

const CHAIN_ID_MOCK = '0x1';
const TOKEN_NAME_MOCK = 'MetaMask Token';
const TOKEN_ADDRESS_MOCK = '0x0439e60F02a8900a951603950d8D4527f400C3f1';
const TOKEN_LIST_ARRAY_MOCK = [
  {
    name: TOKEN_NAME_MOCK,
    address: TOKEN_ADDRESS_MOCK,
  },
] as unknown as TokenListToken[];
const normalizedTokenListMock = [
  {
    address: TOKEN_ADDRESS_MOCK,
    name: TOKEN_NAME_MOCK,
  },
];

describe('useTokenList', () => {
  const selectChainIdMock = jest.mocked(selectChainId);
  const selectUseTokenDetectionMock = jest.mocked(selectUseTokenDetection);
  const selectTokenListArrayMock = jest.mocked(selectTokenListArray);
  const isMainnetByChainIdMock = jest.mocked(isMainnetByChainId);
  beforeEach(() => {
    jest.resetAllMocks();
    selectChainIdMock.mockReturnValue(CHAIN_ID_MOCK);
    selectUseTokenDetectionMock.mockReturnValue(true);
    selectTokenListArrayMock.mockReturnValue(TOKEN_LIST_ARRAY_MOCK);
    isMainnetByChainIdMock.mockReturnValue(true);

    const memoizedValues = new Map();
    jest.spyOn(React, 'useMemo').mockImplementation((factory, deps) => {
      const depsKey = (deps as []).join('|');
      if (memoizedValues.has(depsKey)) {
        return memoizedValues.get(depsKey);
      }
      const newValue = factory();
      memoizedValues.set(depsKey, newValue);
      return newValue;
    });
  });

  it('returns normalized STATIC_MAINNET_TOKEN_LIST if token detection is disabled and chain is mainnet', () => {
    selectUseTokenDetectionMock.mockReturnValue(false);
    isMainnetByChainIdMock.mockReturnValue(true);
    const tokenList = useTokenList();

    expect(tokenList).toStrictEqual(normalizedMainnetTokenListMock);
  });

  it('returns normalized token list if token detection is enabled', () => {
    selectUseTokenDetectionMock.mockReturnValue(true);
    isMainnetByChainIdMock.mockReturnValue(true);
    const tokenList = useTokenList();

    expect(tokenList).toStrictEqual(normalizedTokenListMock);
  });

  it('returns normalized token list if chain is not mainnet', () => {
    selectUseTokenDetectionMock.mockReturnValue(true);
    isMainnetByChainIdMock.mockReturnValue(false);
    const tokenList = useTokenList();

    expect(tokenList).toStrictEqual(normalizedTokenListMock);
  });
});
