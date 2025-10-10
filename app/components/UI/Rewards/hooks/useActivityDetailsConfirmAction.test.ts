import { renderHook, act } from '@testing-library/react-hooks';
import { Linking } from 'react-native';
import { useActivityDetailsConfirmAction } from './useActivityDetailsConfirmAction';
import { PointsEventDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('./useTransactionExplorer', () => ({
  useTransactionExplorer: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(() => 'View on'),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  ButtonVariant: { Secondary: 'Secondary' },
}));

describe('useActivityDetailsConfirmAction', () => {
  const { useTransactionExplorer } = jest.requireMock(
    './useTransactionExplorer',
  ) as { useTransactionExplorer: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined for non-SWAP events', () => {
    const event = { type: 'CLAIM', payload: {} } as unknown as PointsEventDto;

    const { result } = renderHook(() => useActivityDetailsConfirmAction(event));

    expect(result.current).toBeUndefined();
    expect(useTransactionExplorer).toHaveBeenCalledWith(undefined, undefined);
  });

  it('returns a confirm action for SWAP and opens URL on press', async () => {
    const explorerInfo = {
      name: 'Etherscan',
      url: 'https://etherscan.io/tx/0x1',
    };
    useTransactionExplorer.mockReturnValue(explorerInfo);

    const event = {
      type: 'SWAP',
      payload: {
        srcAsset: { type: 'eip155:1/erc20:0xToken' },
        txHash: '0x1',
      },
    } as unknown as PointsEventDto;

    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined as unknown as boolean);

    const { result } = renderHook(() => useActivityDetailsConfirmAction(event));

    expect(result.current).toBeDefined();
    expect(result.current?.label).toContain('Etherscan');

    act(() => {
      result.current?.onPress?.();
    });

    expect(openUrlSpy).toHaveBeenCalledWith(explorerInfo.url);
  });
});
