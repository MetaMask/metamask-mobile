import '../mocks';
import React from 'react';
import { renderComponentViewScreen } from '../render';
import OwnedTokensList from '../../../app/components/Views/AddAsset/components/OwnedTokens/OwnedTokensList';
import TokenView from '../../../app/components/Views/AddAsset/Views/TokenView/TokenView';
import {
  initialStateFindTokensOnly,
  initialStateOwnedTokens,
} from '../presets/ownedTokens';

export function renderOwnedTokensList(
  options: { flagEnabled?: boolean; privacyMode?: boolean } = {},
) {
  const state = initialStateOwnedTokens(options).build();
  return renderComponentViewScreen(
    OwnedTokensList as unknown as React.ComponentType,
    { name: 'OwnedTokens' },
    { state },
  );
}

const FindTokensHarness = () => (
  <TokenView
    selectedNetwork="0x1"
    openNetworkSelector={() => undefined}
    networkConfigurations={{}}
  />
);

export function renderFindTokensView() {
  const state = initialStateFindTokensOnly().build();
  return renderComponentViewScreen(
    FindTokensHarness as unknown as React.ComponentType,
    { name: 'FindTokens' },
    { state },
  );
}
