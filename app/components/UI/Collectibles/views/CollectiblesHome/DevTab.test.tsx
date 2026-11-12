import React from 'react';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { fireEvent, screen } from '@testing-library/react-native';
import { toast } from '@metamask/design-system-react-native';
import { initialStateCollectibles } from '../../../../../../tests/component-view/presets/collectibles';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';
import { CollectiblesDevTestIds } from '../../Collectibles.testIds';
import { isCollectiblesDevEnabled } from '../../dev/devTools';
import { PACK_PARTNER_DEVNET_FAUCET_URL } from '../../providers/pack-partner/constants';
import { MOCK_ACCOUNT } from '../testUtils';
import DevTab from './DevTab';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Narrow native-boundary fallback: the environment is compiled into the app,
// so CV cannot vary this gate through Redux. Account selection remains real.
jest.mock('../../dev/devTools', () => ({
  isCollectiblesDevEnabled: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => ({
  ...jest.requireActual('@metamask/design-system-react-native'),
  toast: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { CollectiblesController: { resetOnboarding: jest.fn() } },
  },
}));

const renderDev = ({ hasSolanaAccount = true } = {}) =>
  renderWithProvider(<DevTab />, {
    state: initialStateCollectibles({ hasSolanaAccount }).build(),
  });

describe('DevTab faucet', () => {
  beforeEach(() => {
    jest.mocked(isCollectiblesDevEnabled).mockReset().mockReturnValue(true);
    jest.mocked(Linking.openURL).mockReset().mockResolvedValue(undefined);
    jest.mocked(Clipboard.setString).mockClear();
    jest.mocked(toast).mockClear();
    mockNavigate.mockClear();
  });

  it('copies the selected Solana address only after pressing copy', () => {
    renderDev();
    expect(
      screen.getByTestId(CollectiblesDevTestIds.ADDRESS),
    ).toHaveTextContent(MOCK_ACCOUNT.address);
    expect(Clipboard.setString).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId(CollectiblesDevTestIds.COPY_ADDRESS));

    expect(Clipboard.setString).toHaveBeenCalledWith(MOCK_ACCOUNT.address);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('opens the documented faucet in the MetaMask browser only on demand', () => {
    renderDev();
    expect(mockNavigate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId(CollectiblesDevTestIds.FAUCET));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: PACK_PARTNER_DEVNET_FAUCET_URL,
        linkType: EXTERNAL_LINK_TYPE,
        timestamp: expect.any(Number),
      },
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('disables faucet and copy without a Solana account', () => {
    renderDev({ hasSolanaAccount: false });

    fireEvent.press(screen.getByTestId(CollectiblesDevTestIds.FAUCET));
    fireEvent.press(screen.getByTestId(CollectiblesDevTestIds.COPY_ADDRESS));

    expect(screen.getByTestId(CollectiblesDevTestIds.FAUCET)).toBeDisabled();
    expect(
      screen.getByTestId(CollectiblesDevTestIds.COPY_ADDRESS),
    ).toBeDisabled();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(Clipboard.setString).not.toHaveBeenCalled();
  });

  it('removes the tools when the environment is mainnet', () => {
    const { rerender } = renderDev();
    expect(
      screen.getByTestId(CollectiblesDevTestIds.CONTAINER),
    ).toBeOnTheScreen();

    jest.mocked(isCollectiblesDevEnabled).mockReturnValue(false);
    rerender(<DevTab />);

    expect(screen.queryByTestId(CollectiblesDevTestIds.CONTAINER)).toBeNull();
    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(Clipboard.setString).not.toHaveBeenCalled();
  });
});
