import { ImageSourcePropType } from 'react-native';
import {
  handleShowNetworkActiveToast,
  shouldShowNetworkListToast,
} from './utils';
import { ToastVariants } from '../../../component-library/components/Toast';
import { strings } from '../../../../locales/i18n';
import {
  clearSuppressedNetworkAddedToast,
  consumeSuppressedNetworkAddedToast,
  resetSuppressedNetworkAddedToasts,
  suppressNextNetworkAddedToast,
} from '../../../util/networks/networkToastSuppression';

describe('handleShowNetworkActiveToast', () => {
  const mockToastRef = {
    current: {
      showToast: jest.fn(),
    },
  };
  const mockNetworkName = 'Ethereum Mainnet';
  const mockNetworkImage: ImageSourcePropType = {
    uri: 'https://example.com/eth.png',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSuppressedNetworkAddedToasts();
  });

  it('shows toast when not on bridge route', () => {
    // Arrange
    const isOnBridgeRoute = false;

    // Act
    handleShowNetworkActiveToast(
      isOnBridgeRoute,
      mockToastRef,
      mockNetworkName,
      mockNetworkImage,
    );

    // Assert
    expect(mockToastRef.current.showToast).toHaveBeenCalledTimes(1);
    expect(mockToastRef.current.showToast).toHaveBeenCalledWith({
      variant: ToastVariants.Network,
      labelOptions: [
        {
          label: `${mockNetworkName} `,
          isBold: true,
        },
        { label: strings('toast.now_active') },
      ],
      networkImageSource: mockNetworkImage,
    });
  });

  it('does not show toast when on bridge route', () => {
    // Arrange
    const isOnBridgeRoute = true;

    // Act
    handleShowNetworkActiveToast(
      isOnBridgeRoute,
      mockToastRef,
      mockNetworkName,
      mockNetworkImage,
    );

    // Assert
    expect(mockToastRef.current.showToast).not.toHaveBeenCalled();
  });

  it('handles undefined toastRef gracefully when not on bridge route', () => {
    // Arrange
    const isOnBridgeRoute = false;
    const undefinedToastRef = undefined;

    // Act & Assert - should not throw
    expect(() =>
      handleShowNetworkActiveToast(
        isOnBridgeRoute,
        undefinedToastRef,
        mockNetworkName,
        mockNetworkImage,
      ),
    ).not.toThrow();
  });

  it('handles toastRef with null current when not on bridge route', () => {
    // Arrange
    const isOnBridgeRoute = false;
    const nullCurrentToastRef = { current: null };

    // Act & Assert - should not throw
    expect(() =>
      handleShowNetworkActiveToast(
        isOnBridgeRoute,
        nullCurrentToastRef,
        mockNetworkName,
        mockNetworkImage,
      ),
    ).not.toThrow();
  });

  it('formats network name with space and bold styling', () => {
    // Arrange
    const isOnBridgeRoute = false;
    const customNetworkName = 'Polygon';

    // Act
    handleShowNetworkActiveToast(
      isOnBridgeRoute,
      mockToastRef,
      customNetworkName,
      mockNetworkImage,
    );

    // Assert
    const calledWith = mockToastRef.current.showToast.mock.calls[0][0];
    expect(calledWith.labelOptions[0]).toEqual({
      label: `${customNetworkName} `,
      isBold: true,
    });
  });

  it('passes through network image source correctly', () => {
    // Arrange
    const isOnBridgeRoute = false;
    const customNetworkImage: ImageSourcePropType = {
      uri: 'https://example.com/polygon.png',
    };

    // Act
    handleShowNetworkActiveToast(
      isOnBridgeRoute,
      mockToastRef,
      mockNetworkName,
      customNetworkImage,
    );

    // Assert
    const calledWith = mockToastRef.current.showToast.mock.calls[0][0];
    expect(calledWith.networkImageSource).toBe(customNetworkImage);
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
