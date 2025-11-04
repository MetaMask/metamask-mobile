import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useSampleNetwork from './useSampleNetwork';
import mockMainnetImage from '../../../../images/linea-mainnet-logo.png';
import mockTestnetImage from '../../../../images/linea-testnet-logo.png';

import {
  selectNetworkImageSource,
  selectNetworkName,
} from '../../../../../selectors/networkInfos';
import {
  selectChainId,
  selectNetworkConfigurations,
} from '../../../../../selectors/networkController';
import { ImageSourcePropType } from 'react-native';
import { Hex } from '@metamask/utils';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useSampleNetwork', () => {
  const mockedUseSelector = useSelector as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSelectors = (overrides: {
    image?: ImageSourcePropType;
    chainId?: Hex;
    configs?: Record<Hex, { name: string }> | undefined;
    fallbackName?: string;
  }) => {
    mockedUseSelector.mockImplementation((selector) => {
      if (selector === selectNetworkImageSource)
        return overrides.image ?? mockTestnetImage;
      if (selector === selectChainId) return overrides.chainId ?? '0xe705';
      if (selector === selectNetworkConfigurations) return overrides.configs;
      if (selector === selectNetworkName)
        return overrides.fallbackName ?? 'Linea Sepolia';
      return undefined;
    });
  };

  it('returns network infos', () => {
    mockSelectors({
      image: mockMainnetImage,
      chainId: '0xe708',
      configs: { '0xe708': { name: 'Linea' } },
    });

    const { result } = renderHook(() => useSampleNetwork());

    expect(result.current).toEqual({
      networkImageSource: mockMainnetImage,
      chainId: '0xe708',
      networkName: 'Linea',
    });
  });

  it('returns fallback name if config missing', () => {
    mockSelectors({
      configs: { '0x2': { name: 'OtherNet' } },
    });

    const { result } = renderHook(() => useSampleNetwork());

    expect(result.current).toEqual({
      networkImageSource: mockTestnetImage,
      chainId: '0xe705',
      networkName: 'Linea Sepolia',
    });
  });

  it('returns fallback on missing networkConfigurations', () => {
    mockSelectors({
      configs: undefined,
    });

    const { result } = renderHook(() => useSampleNetwork());

    expect(result.current).toEqual({
      networkImageSource: mockTestnetImage,
      chainId: '0xe705',
      networkName: 'Linea Sepolia',
    });
  });
});
