///: BEGIN:ONLY_INCLUDE_IF(stellar)
import React from 'react';
import { render, userEvent } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import NotificationManager from '../../../core/NotificationManager';
import type { TokenI } from '../Tokens/types';
import {
  AssetActivateCard,
  AssetActivateCardTestIds,
} from './AssetActivateCard';

const PUBNET_USDC_ASSET =
  'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' as CaipAssetType;

const mockNavigate = jest.fn();
const mockActivateAsset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../TokenDetails/hooks/useAssetActivation', () => ({
  useAssetActivation: () => ({
    activateAsset: mockActivateAsset,
    isActivating: false,
  }),
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

const STELLAR_TOKEN = {
  address: PUBNET_USDC_ASSET,
  chainId: 'stellar:pubnet',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 7,
  balance: '0',
  balanceFiat: '$0',
  logo: '',
  image: '',
  isETH: false,
  hasBalanceError: false,
  aggregators: [],
} as TokenI;

describe('AssetActivateCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActivateAsset.mockResolvedValue({
      success: true,
      errorMessage: null,
    });
  });

  it('renders the activate card with asset and chain details', () => {
    const { getByTestId, getByText } = render(
      <AssetActivateCard token={STELLAR_TOKEN} chainName="Stellar" />,
    );

    expect(getByTestId(AssetActivateCardTestIds.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(AssetActivateCardTestIds.BUTTON)).toBeOnTheScreen();
    expect(
      getByText(
        strings('asset_activation.activate_description', {
          symbol: 'USDC',
          chainName: 'Stellar',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('navigates to transactions view when activation succeeds', async () => {
    const { getByTestId } = render(
      <AssetActivateCard token={STELLAR_TOKEN} chainName="Stellar" />,
    );

    await userEvent.press(getByTestId(AssetActivateCardTestIds.BUTTON));

    expect(mockActivateAsset).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
    expect(NotificationManager.showSimpleNotification).not.toHaveBeenCalled();
  });

  it('shows an error notification when activation fails', async () => {
    mockActivateAsset.mockResolvedValue({
      success: false,
      errorMessage: 'activate error',
    });

    const { getByTestId } = render(
      <AssetActivateCard token={STELLAR_TOKEN} chainName="Stellar" />,
    );

    await userEvent.press(getByTestId(AssetActivateCardTestIds.BUTTON));

    expect(NotificationManager.showSimpleNotification).toHaveBeenCalledWith({
      status: 'error',
      duration: 5000,
      title: strings('transactions.activity_trustline_activation_failed'),
      description: 'activate error',
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate or notify when activation is cancelled', async () => {
    mockActivateAsset.mockResolvedValue({
      success: false,
      errorMessage: null,
    });

    const { getByTestId } = render(
      <AssetActivateCard token={STELLAR_TOKEN} chainName="Stellar" />,
    );

    await userEvent.press(getByTestId(AssetActivateCardTestIds.BUTTON));

    expect(mockActivateAsset).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(NotificationManager.showSimpleNotification).not.toHaveBeenCalled();
  });
});
///: END:ONLY_INCLUDE_IF
