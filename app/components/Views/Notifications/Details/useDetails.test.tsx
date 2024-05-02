import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector, useDispatch, Provider } from 'react-redux';
import { Theme } from '../../../../util/theme/models';
import useDetails from './useDetails';
import { Notification, TRIGGER_TYPES } from '../../../../util/notifications';
import { store } from '../../../../store';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../selectors/currencyRateController', () => ({
  selectConversionRate: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../selectors/tokenRatesController', () => ({
  selectContractExchangeRates: jest.fn(),
}));

jest.mock('../../../../util/notifications', () => ({
  ...jest.requireActual('../../../../util/notifications'),
  returnAvatarProps: jest.fn(),
}));

jest.mock('../../../../component-library/components/Icons/Icon', () => ({
  Icon: jest.fn(() => <></>),
}));

describe('useDetails', () => {
  const notification = {
    type: TRIGGER_TYPES.LIDO_STAKE_COMPLETED,
    block_number: 18487118,
    block_timestamp: '1698961091',
    chain_id: 1,
    created_at: '2023-11-02T22:28:49.970865Z',
    data: {
      kind: 'lido_stake_completed',
      stake_in: {
        usd: '1806.33',
        name: 'Ethereum',
        image:
          'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/stETH.svg',
        amount: '330303634023928032',
        symbol: 'ETH',
        address: '0x0000000000000000000000000000000000000000',
        decimals: '18',
      },
      stake_out: {
        usd: '1801.30',
        name: 'Liquid staked Ether 2.0',
        image:
          'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/stETH.svg',
        amount: '330303634023928032',
        symbol: 'STETH',
        address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
        decimals: '18',
      },
      network_fee: {
        gas_price: '26536359866',
        native_token_price_in_usd: '1806.33',
      },
    },
    id: '9d9b1467-b3ee-5492-8ca2-22382657b690',
    trigger_id: 'ec10d66a-f78f-461f-83c9-609aada8cc50',
    tx_hash:
      '0x8cc0fa805f7c3b1743b14f3b91c6b824113b094f26d4ccaf6a71ad8547ce6a0f',
    unread: true,
    createdAt: new Date(),
    isRead: false,
  } as Notification;

  const theme = {
    colors: {
      success: {
        muted: '#123456',
      },
      alternative: '#654321',
    },
  } as Theme;

  const mockUseSelector = useSelector as jest.Mock;
  const mockUseDispatch = useDispatch as jest.Mock;
  const mockRenderAvatarProps = returnAvatarProps as jest.Mock;
  const mockSelectConversionRate = selectConversionRate as jest.Mock;
  const mockSelectCurrentCurrency = selectCurrentCurrency as jest.Mock;
  const mockSelectContractExchangeRates =
    selectContractExchangeRates as jest.Mock;

  beforeEach(() => {
    mockUseSelector.mockReset();
    mockUseDispatch.mockReset();
    mockRenderAvatarProps.mockReset();
    mockSelectConversionRate.mockReset();
    mockSelectCurrentCurrency.mockReset();
    mockSelectContractExchangeRates.mockReset();
  });

  it('should return renderNFT, renderTransfer, renderStake, renderStakeReadyToBeWithdrawn and renderSwap functions', () => {
    const {
      renderNFT,
      renderTransfer,
      renderStake,
      renderStakeReadyToBeWithdrawn,
      renderSwap,
    } = useDetails({
      notification,
      theme,
      accountAvatarType: AvatarAccountType.JazzIcon,
      navigation: {},
      copyToClipboard: () => Promise.resolve(),
    });
    expect(renderNFT).toBeDefined();
    expect(renderTransfer).toBeDefined();
    expect(renderStake).toBeDefined();
    expect(renderStakeReadyToBeWithdrawn).toBeDefined();
    expect(renderSwap).toBeDefined();
  });

  describe('renderNFT', () => {
    it('should return a valid JSX', () => {
      const renderNFT = useDetails({
        notification,
        theme,
        accountAvatarType: AvatarAccountType.JazzIcon,
        navigation: {},
        copyToClipboard: () => Promise.resolve(),
      }).renderNFT;
      const { queryByText, getByRole } = render(
        <Provider store={store}>{renderNFT(notification)}</Provider>,
      );
      expect(getByRole('img')).toBeDefined();
      expect(queryByText('From')).toBeDefined();
      expect(queryByText('To')).toBeDefined();
      expect(queryByText('Status')).toBeDefined();
      expect(queryByText('Network')).toBeDefined();
      expect(queryByText('Collection')).toBeDefined();
    });

    it('should call copyToClipboard when an address is copied', () => {
      const mockCopyToClipboard = jest.fn();
      const renderNFT = useDetails({
        notification,
        theme,
        accountAvatarType: AvatarAccountType.JazzIcon,
        navigation: {},
        copyToClipboard: mockCopyToClipboard,
      }).renderNFT;
      const { getByText } = render(
        <Provider store={store}>{renderNFT(notification)}</Provider>,
      );
      const copyToClipboardBtn = getByText('0x2222');
      fireEvent.press(copyToClipboardBtn);
      expect(mockCopyToClipboard).toHaveBeenCalledWith('address', '0x2222');
    });
  });

  describe('renderTransfer', () => {
    it('should return a valid JSX', () => {
      const renderTransfer = useDetails({
        notification,
        theme,
        accountAvatarType: AvatarAccountType.JazzIcon,
        navigation: {},
        copyToClipboard: () => Promise.resolve(),
      }).renderTransfer;
      const { queryByText, getByText } = render(
        <Provider store={store}>{renderTransfer(notification)}</Provider>,
      );
      expect(queryByText('From')).toBeDefined();
      expect(queryByText('To')).toBeDefined();
      expect(queryByText('Status')).toBeDefined();
      expect(queryByText('Network')).toBeDefined();
      expect(getByText('1 ETH')).toBeDefined();
    });

    it('should call copyToClipboard when an address is copied', () => {
      const mockCopyToClipboard = jest.fn();
      const renderTransfer = useDetails({
        notification,
        theme,
        accountAvatarType: AvatarAccountType.JazzIcon,
        navigation: {},
        copyToClipboard: mockCopyToClipboard,
      }).renderTransfer;
      const { getByText } = render(
        <Provider store={store}>{renderTransfer(notification)}</Provider>,
      );
      const copyToClipboardBtn = getByText('0x1111');
      fireEvent.press(copyToClipboardBtn);
      expect(mockCopyToClipboard).toHaveBeenCalledWith('address', '0x1111');
    });
  });
});
