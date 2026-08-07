import React from 'react';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import useNetworkInfo from '../../../hooks/useNetworkInfo';
import { NATIVE_TOKEN_ADDRESS } from '../../../constants/tokens';
import { GasFeeTokenIcon } from './gas-fee-token-icon';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { useTransactionBatchesMetadata } from '../../../hooks/transactions/useTransactionBatchesMetadata';
import { merge } from 'lodash';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { getAssetImageUrl } from '../../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/transactions/useTransactionBatchesMetadata');
jest.mock('../../../hooks/useNetworkInfo');
jest.mock('../../../hooks/tokens/useTokenWithBalance', () => ({
  useTokenWithBalance: jest
    .fn()
    .mockReturnValue({ asset: { logo: 'logo.png' } }),
}));
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: jest.fn(),
}));
jest.mock(
  '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => jest.fn(() => null),
);

describe('GasFeeTokenIcon', () => {
  const mockUseNetworkInfo = jest.mocked(useNetworkInfo);
  const mockUseTokenWithBalance = jest.mocked(useTokenWithBalance);
  const mockUseTransactionBatchesMetadata = jest.mocked(
    useTransactionBatchesMetadata,
  );
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );
  const mockGetAssetImageUrl = jest.mocked(getAssetImageUrl);
  const mockAvatarToken = jest.mocked(AvatarToken);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkInfo.mockReturnValue({
      networkImage: 10,
      networkNativeCurrency: 'ETH',
      networkName: 'Ethereum',
    });
    mockUseTransactionBatchesMetadata.mockReturnValue(undefined);
    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId: '0x1',
    } as Partial<
      ReturnType<typeof useTransactionMetadataRequest>
    > as ReturnType<typeof useTransactionMetadataRequest>);
    mockUseTokenWithBalance.mockReturnValue({
      image: 'logo.png',
      symbol: 'TOKEN',
    } as ReturnType<typeof useTokenWithBalance>);
    mockGetAssetImageUrl.mockReturnValue(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xtoken.png',
    );
  });

  it('renders the token icon when tokenAddress is not the native', () => {
    const tokenAddress = '0xTokenAddress' as Hex;

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={tokenAddress} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('token-icon')).toBeOnTheScreen();
    expect(getByTestId('gas-fee-token-network-badge')).toBeOnTheScreen();
  });

  it('renders token icon without network badge when network image is missing', () => {
    const tokenAddress = '0xTokenAddress' as Hex;
    mockUseNetworkInfo.mockReturnValue({});

    const { getByTestId, queryByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={tokenAddress} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('token-icon')).toBeOnTheScreen();
    expect(queryByTestId('gas-fee-token-network-badge')).not.toBeOnTheScreen();
  });

  it('falls back to CDN token image when TokensController image is missing', () => {
    const tokenAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
    const chainId = '0xe708' as Hex;
    const cdnImageUrl =
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png';

    mockUseTransactionMetadataRequest.mockReturnValue({
      chainId,
    } as Partial<
      ReturnType<typeof useTransactionMetadataRequest>
    > as ReturnType<typeof useTransactionMetadataRequest>);
    mockUseTokenWithBalance.mockReturnValue({
      image: undefined,
      symbol: 'mUSD',
    } as unknown as ReturnType<typeof useTokenWithBalance>);
    mockGetAssetImageUrl.mockReturnValue(cdnImageUrl);

    renderWithProvider(<GasFeeTokenIcon tokenAddress={tokenAddress} />, {
      state: transferTransactionStateMock,
    });

    expect(mockGetAssetImageUrl).toHaveBeenCalledWith(tokenAddress, chainId);
    expect(mockAvatarToken).toHaveBeenCalledWith(
      expect.objectContaining({
        imageSource: { uri: cdnImageUrl },
        name: 'mUSD',
      }),
      undefined,
    );
  });

  it('renders the native token icon when tokenAddress is the native', () => {
    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('native-icon')).toBeOnTheScreen();
  });

  it('renders native icon when asset is not found', () => {
    mockUseTokenWithBalance.mockReturnValue({
      asset: undefined,
      displayName: undefined,
    } as unknown as ReturnType<typeof mockUseTokenWithBalance>);

    const { getByTestId } = renderWithProvider(
      <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
      { state: transferTransactionStateMock },
    );

    expect(getByTestId('native-icon')).toBeOnTheScreen();
  });

  describe('Batch Transactions', () => {
    it('uses chainId from batch metadata when transaction metadata is unavailable', () => {
      const batchChainId = '0xe708';
      mockUseTransactionBatchesMetadata.mockReturnValue({
        chainId: batchChainId,
      } as Partial<
        ReturnType<typeof mockUseTransactionBatchesMetadata>
      > as ReturnType<typeof mockUseTransactionBatchesMetadata>);
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);

      // Create state without transaction metadata
      const stateWithoutTransactionMeta = merge(
        {},
        transferTransactionStateMock,
        {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [],
              },
            },
          },
        },
      );

      const { getByTestId } = renderWithProvider(
        <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
        { state: stateWithoutTransactionMeta },
      );

      expect(getByTestId('native-icon')).toBeOnTheScreen();
      expect(mockUseNetworkInfo).toHaveBeenCalledWith(batchChainId);
    });

    it('prefers transaction metadata chainId over batch metadata chainId', () => {
      const batchChainId = '0xe708';
      const transactionChainId = '0x1';

      mockUseTransactionBatchesMetadata.mockReturnValue({
        chainId: batchChainId,
      } as Partial<
        ReturnType<typeof mockUseTransactionBatchesMetadata>
      > as ReturnType<typeof mockUseTransactionBatchesMetadata>);

      // State has transaction metadata with chainId
      renderWithProvider(
        <GasFeeTokenIcon tokenAddress={NATIVE_TOKEN_ADDRESS} />,
        { state: transferTransactionStateMock },
      );

      // Should use transaction chainId (0x1 from transferTransactionStateMock)
      expect(mockUseNetworkInfo).toHaveBeenCalledWith(transactionChainId);
    });
  });
});
