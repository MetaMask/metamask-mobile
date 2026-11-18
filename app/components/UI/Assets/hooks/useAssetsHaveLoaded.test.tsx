import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectAssetsHaveLoadedForSelectedAccountGroup } from '../../../../selectors/assets/assets-controller';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  AssetsHaveLoadedProvider,
  useAssetsHaveLoaded,
} from './useAssetsHaveLoaded';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const Probe = () => {
  const assetsHaveLoaded = useAssetsHaveLoaded();

  return <Text testID="assets-have-loaded">{String(assetsHaveLoaded)}</Text>;
};

describe('AssetsHaveLoadedProvider', () => {
  it('keeps an account group settled during later background refreshes', () => {
    let selectedAccountGroup: string | null = 'entropy:wallet/group-1';
    let currentLoadHasSettled = false;

    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroupId) {
        return selectedAccountGroup;
      }
      if (selector === selectAssetsHaveLoadedForSelectedAccountGroup) {
        return currentLoadHasSettled;
      }
      return undefined;
    });

    const view = render(
      <AssetsHaveLoadedProvider>
        <Probe />
      </AssetsHaveLoadedProvider>,
    );

    expect(screen.getByTestId('assets-have-loaded')).toHaveTextContent('false');

    currentLoadHasSettled = true;
    view.rerender(
      <AssetsHaveLoadedProvider>
        <Probe />
      </AssetsHaveLoadedProvider>,
    );
    expect(screen.getByTestId('assets-have-loaded')).toHaveTextContent('true');

    currentLoadHasSettled = false;
    view.rerender(
      <AssetsHaveLoadedProvider>
        <Probe />
      </AssetsHaveLoadedProvider>,
    );
    expect(screen.getByTestId('assets-have-loaded')).toHaveTextContent('true');

    selectedAccountGroup = 'entropy:wallet/group-2';
    view.rerender(
      <AssetsHaveLoadedProvider>
        <Probe />
      </AssetsHaveLoadedProvider>,
    );
    expect(screen.getByTestId('assets-have-loaded')).toHaveTextContent('false');
  });
});
