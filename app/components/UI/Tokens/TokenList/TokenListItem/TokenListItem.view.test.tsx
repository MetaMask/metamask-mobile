import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../../tests/component-view/render';
import {
  TRON_MAINNET,
  TRON_NATIVE_ASSET_ID,
  buildTronStakedAssetsState,
} from '../../../../../../tests/component-view/fixtures/tronStakedAssets';
import type { FlashListAssetKey } from '../TokenList';
import { TokenListItem } from './TokenListItem';

const stakedTrxKey: FlashListAssetKey = {
  address: TRON_NATIVE_ASSET_ID,
  chainId: TRON_MAINNET,
  isStaked: true,
};

function renderTokenListItem(): React.ReactElement {
  return (
    <TokenListItem
      assetKey={stakedTrxKey}
      showRemoveMenu={jest.fn()}
      setShowScamWarningModal={jest.fn()}
      privacyMode={false}
    />
  );
}

describe('TokenListItem — staked Tron row (CV)', () => {
  it('opens the liquid TRX token when the Staked TRX row is pressed', async () => {
    const state = buildTronStakedAssetsState();

    const { findByText, findByTestId } = renderScreenWithRoutes(
      renderTokenListItem,
      { name: 'TokenListItemTest' },
      [{ name: 'Asset', Component: createRouteParamsProbe('Asset') }],
      { state },
    );

    fireEvent.press(await findByText('Staked TRX'));

    const paramsProbe = await findByTestId(getRouteParamsProbeTestId('Asset'));
    expect(JSON.parse(paramsProbe.props.children)).toEqual(
      expect.objectContaining({
        name: 'TRON',
        balance: '0',
        isStaked: false,
        chainId: TRON_MAINNET,
      }),
    );
  });
});
