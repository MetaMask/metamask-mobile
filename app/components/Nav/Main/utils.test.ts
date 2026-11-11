import { ImageSourcePropType } from 'react-native';
import { toast } from '@metamask/design-system-react-native';
import {
  handleShowNetworkActiveToast,
  shouldShowNetworkListToast,
} from './utils';
import { strings } from '../../../../locales/i18n';
import {
  clearSuppressedNetworkAddedToast,
  consumeSuppressedNetworkAddedToast,
  resetSuppressedNetworkAddedToasts,
  suppressNextNetworkAddedToast,
} from '../../../util/networks/networkToastSuppression';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

describe('handleShowNetworkActiveToast', () => {
  const mockNetworkName = 'Ethereum Mainnet';
  const mockNetworkImage: ImageSourcePropType = {
    uri: 'https://example.com/eth.png',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSuppressedNetworkAddedToasts();
  });

  it('shows toast when not on bridge route', () => {
    const isOnBridgeRoute = false;

    handleShowNetworkActiveToast(
      isOnBridgeRoute,
      mockNetworkName,
      mockNetworkImage,
    );

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `${mockNetworkName} ${strings('toast.now_active')}`,
        showCloseButton: false,
      }),
    );
  });

  it('does not show toast when on bridge route', () => {
    const isOnBridgeRoute = true;

    handleShowNetworkActiveToast(
      isOnBridgeRoute,
      mockNetworkName,
      mockNetworkImage,
    );

    expect(toast).not.toHaveBeenCalled();
  });

  it('formats network name with now-active copy', () => {
    const isOnBridgeRoute = false;
    const customNetworkName = 'Polygon';

    handleShowNetworkActiveToast(
      isOnBridgeRoute,
      customNetworkName,
      mockNetworkImage,
    );

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `${customNetworkName} ${strings('toast.now_active')}`,
      }),
    );
  });

  it('passes through network image source as start accessory', () => {
    const isOnBridgeRoute = false;
    const customNetworkImage: ImageSourcePropType = {
      uri: 'https://example.com/polygon.png',
    };

    handleShowNetworkActiveToast(
      isOnBridgeRoute,
      mockNetworkName,
      customNetworkImage,
    );

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        startAccessory: expect.anything(),
      }),
    );
  });
});

describe('shouldShowNetworkListToast', () => {
  beforeEach(() => {
    resetSuppressedNetworkAddedToasts();
  });

  it('suppresses an added-network toast only once', () => {
    suppressNextNetworkAddedToast('0xa');

    expect(
      shouldShowNetworkListToast({
        newNetworkChainId: '0xa',
        hasDeletedNetwork: false,
      }),
    ).toBe(false);

    expect(
      shouldShowNetworkListToast({
        newNetworkChainId: '0xa',
        hasDeletedNetwork: false,
      }),
    ).toBe(true);
  });

  it('clears suppressed added-network toasts explicitly', () => {
    suppressNextNetworkAddedToast('0xa');

    clearSuppressedNetworkAddedToast('0xa');

    expect(consumeSuppressedNetworkAddedToast('0xa')).toBe(false);
  });

  it('returns false when consuming without a chain id', () => {
    expect(consumeSuppressedNetworkAddedToast()).toBe(false);
  });
});
