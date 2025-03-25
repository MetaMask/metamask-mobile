import { act } from '@testing-library/react-native';
import useVaultMetadata from './useVaultMetadata';
import {
  MOCK_GET_VAULT_RESPONSE,
  MOCK_SELECT_POOLED_STAKING_VAULT_APY,
} from '../__mocks__/mockData';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Engine from '../../../../core/Engine';
import { PooledStakingState } from '@metamask/earn-controller';
import { RootState } from '../../../../reducers';
import { useSelector } from 'react-redux';
import { pooledStakingSelectors } from '../../../../selectors/earnController';

const { selectVaultApy } = pooledStakingSelectors;

const mockVaultMetadata = MOCK_GET_VAULT_RESPONSE;

jest.mock('../../../../core/Engine', () => ({
  context: {
    EarnController: {
      refreshPooledStakingVaultMetadata: jest.fn(),
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const renderHook = (vaultMetadata?: PooledStakingState['vaultMetadata']) => {
  const mockState: DeepPartial<RootState> = {
    engine: {
      backgroundState: {
        ...backgroundState,
        EarnController: {
          pooled_staking: {
            vaultMetadata: {
              ...mockVaultMetadata,
              ...vaultMetadata,
            },
          },
        },
      },
    },
  };

  return renderHookWithProvider(() => useVaultMetadata(), {
    state: mockState,
  });
};

describe('useVaultMetadata', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectVaultApy) {
        return MOCK_SELECT_POOLED_STAKING_VAULT_APY;
      }
    });
  });

  describe('when fetching vault metadata', () => {
    it('handles error if the API request fails', async () => {
      // Simulate API error
      (
        Engine.context.EarnController
          .refreshPooledStakingVaultMetadata as jest.Mock
      ).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook();

      await act(async () => {
        await result.current.refreshVaultMetadata();
      });

      expect(result.current.isLoadingVaultMetadata).toBe(false);
      expect(result.current.error).toBe('Failed to fetch vault metadata');
    });
  });
});
