import React from 'react';
import { Text } from 'react-native';
import { TransactionMeta } from '@metamask/transaction-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
// eslint-disable-next-line import/no-namespace
import * as TransactionMetadataRequestHook from '../../hooks/transactions/useTransactionMetadataRequest';
import { ConfirmationAssetPollingProvider } from './confirmation-asset-polling-provider';
import { AssetPollingProvider } from '../../../../hooks/AssetPolling/AssetPollingProvider';
import { selectEnabledSourceChains } from '../../../../../core/redux/slices/bridge';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';

const CHAIN_ID_MOCK = '0x1';
const CHAIN_ID_2_MOCK = '0x2';

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectEnabledSourceChains: jest.fn(),
}));

jest.mock('../../../../hooks/AssetPolling/AssetPollingProvider', () => ({
  AssetPollingProvider: jest.fn(() => null),
}));

describe('ConfirmationAssetPollingProvider', () => {
  const mockTransactionMetadata = {
    id: 'test-transaction-id',
    chainId: CHAIN_ID_MOCK,
    networkClientId: 'mainnet',
    txParams: {
      from: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
      to: '0x1234567890123456789012345678901234567890',
      value: '0x0',
    },
    status: 'unapproved',
    time: Date.now(),
  } as unknown as TransactionMeta;

  const mockAssetPollingProvider = jest.mocked(AssetPollingProvider);
  const selectEnabledSourceChainsMock = jest.mocked(selectEnabledSourceChains);

  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetPollingProvider.mockClear();
    selectEnabledSourceChainsMock.mockReturnValue([
      { chainId: CHAIN_ID_MOCK, isEvm: true },
      { chainId: CHAIN_ID_2_MOCK, isEvm: true },
      { chainId: 'SolanaChainId', isEvm: false },
    ] as unknown as MultichainNetworkConfiguration[]);
  });

  describe('when transaction metadata is available', () => {
    beforeEach(() => {
      jest
        .spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest')
        .mockReturnValue(mockTransactionMetadata);
    });

    it('renders children wrapped with AssetPollingProvider', () => {
      const TestChild = () => <Text testID="test-child">Test Child</Text>;

      const { getByTestId } = renderWithProvider(
        <ConfirmationAssetPollingProvider>
          <TestChild />
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(getByTestId('test-child')).toBeTruthy();
    });

    it('passes correct props to AssetPollingProvider', () => {
      const TestChild = () => <Text testID="test-child">Test Child</Text>;

      renderWithProvider(
        <ConfirmationAssetPollingProvider>
          <TestChild />
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(mockAssetPollingProvider).toHaveBeenCalledWith(
        {
          chainIds: [CHAIN_ID_MOCK, CHAIN_ID_2_MOCK],
          networkClientId: 'mainnet',
          address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
        },
        expect.anything(),
      );
    });

    it('renders multiple children correctly', () => {
      const FirstChild = () => <Text testID="first-child">First Child</Text>;
      const SecondChild = () => <Text testID="second-child">Second Child</Text>;

      const { getByTestId } = renderWithProvider(
        <ConfirmationAssetPollingProvider>
          <FirstChild />
          <SecondChild />
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(getByTestId('first-child')).toBeTruthy();
      expect(getByTestId('second-child')).toBeTruthy();
    });
  });

  describe('when transaction metadata is not available', () => {
    beforeEach(() => {
      jest
        .spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest')
        .mockReturnValue(undefined);
    });

    it('renders children directly without AssetPollingProvider', () => {
      const TestChild = () => <Text testID="test-child">Test Child</Text>;

      const { getByTestId } = renderWithProvider(
        <ConfirmationAssetPollingProvider>
          <TestChild />
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(getByTestId('test-child')).toBeTruthy();
      expect(mockAssetPollingProvider).not.toHaveBeenCalled();
    });

    it('renders multiple children directly without AssetPollingProvider', () => {
      const FirstChild = () => <Text testID="first-child">First Child</Text>;
      const SecondChild = () => <Text testID="second-child">Second Child</Text>;

      const { getByTestId } = renderWithProvider(
        <ConfirmationAssetPollingProvider>
          <FirstChild />
          <SecondChild />
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(getByTestId('first-child')).toBeTruthy();
      expect(getByTestId('second-child')).toBeTruthy();
      expect(mockAssetPollingProvider).not.toHaveBeenCalled();
    });
  });

  describe('when transaction metadata is undefined', () => {
    beforeEach(() => {
      jest
        .spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest')
        .mockReturnValue(undefined);
    });

    it('render children directly without AssetPollingProvider', () => {
      const TestChild = () => <Text testID="test-child">Test Child</Text>;

      const { getByTestId } = renderWithProvider(
        <ConfirmationAssetPollingProvider>
          <TestChild />
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(getByTestId('test-child')).toBeTruthy();
      expect(mockAssetPollingProvider).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles empty children gracefully when transaction metadata is available', () => {
      jest
        .spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest')
        .mockReturnValue(mockTransactionMetadata);

      renderWithProvider(
        <ConfirmationAssetPollingProvider>
          {null}
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(mockAssetPollingProvider).toHaveBeenCalledWith(
        {
          chainIds: [CHAIN_ID_MOCK, CHAIN_ID_2_MOCK],
          networkClientId: 'mainnet',
          address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
        },
        expect.anything(),
      );
    });

    it('handles empty children gracefully when transaction metadata is not available', () => {
      jest
        .spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest')
        .mockReturnValue(undefined);

      renderWithProvider(
        <ConfirmationAssetPollingProvider>
          {null}
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(mockAssetPollingProvider).not.toHaveBeenCalled();
    });

    it('handles different chainId formats correctly', () => {
      const customTransactionMetadata = {
        ...mockTransactionMetadata,
        chainId: '0x89' as `0x${string}`,
        networkClientId: 'polygon-mainnet',
      };

      jest
        .spyOn(TransactionMetadataRequestHook, 'useTransactionMetadataRequest')
        .mockReturnValue(customTransactionMetadata);

      const TestChild = () => <Text testID="test-child">Test Child</Text>;

      renderWithProvider(
        <ConfirmationAssetPollingProvider>
          <TestChild />
        </ConfirmationAssetPollingProvider>,
        { state: {} },
      );

      expect(mockAssetPollingProvider).toHaveBeenCalledWith(
        {
          chainIds: [CHAIN_ID_MOCK, CHAIN_ID_2_MOCK],
          networkClientId: 'polygon-mainnet',
          address: '0x935e73edb9ff52e23bac7f7e043a1ecd06d05477',
        },
        expect.anything(),
      );
    });
  });
});
