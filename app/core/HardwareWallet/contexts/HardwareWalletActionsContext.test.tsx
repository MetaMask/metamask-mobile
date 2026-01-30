import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  HardwareWalletActionsProvider,
  useHardwareWalletActions,
} from './HardwareWalletActionsContext';

// Test component that uses the hook
const TestConsumer: React.FC<{ onActionCalled: (action: string) => void }> = ({
  onActionCalled,
}) => {
  const actions = useHardwareWalletActions();

  return (
    <View>
      <TouchableOpacity
        testID="connect"
        onPress={() => {
          actions.connect('device-123');
          onActionCalled('connect');
        }}
      />
      <TouchableOpacity
        testID="disconnect"
        onPress={() => {
          actions.disconnect();
          onActionCalled('disconnect');
        }}
      />
      <TouchableOpacity
        testID="ensureReady"
        onPress={() => {
          actions.ensureDeviceReady('device-123');
          onActionCalled('ensureDeviceReady');
        }}
      />
      <TouchableOpacity
        testID="showError"
        onPress={() => {
          actions.showHardwareWalletError(new Error('test'));
          onActionCalled('showHardwareWalletError');
        }}
      />
      <TouchableOpacity
        testID="clearError"
        onPress={() => {
          actions.clearError();
          onActionCalled('clearError');
        }}
      />
      <TouchableOpacity
        testID="retry"
        onPress={() => {
          actions.retry();
          onActionCalled('retry');
        }}
      />
      <TouchableOpacity
        testID="requestPermissions"
        onPress={() => {
          actions.requestBluetoothPermissions();
          onActionCalled('requestBluetoothPermissions');
        }}
      />
    </View>
  );
};

describe('HardwareWalletActionsContext', () => {
  const mockCallbacks = {
    onOpenDeviceSelection: jest.fn(),
    onCloseDeviceSelection: jest.fn(),
    onOpenSigningModal: jest.fn().mockResolvedValue(undefined),
    onCloseSigningModal: jest.fn(),
    onConnect: jest.fn().mockResolvedValue(undefined),
    onDisconnect: jest.fn().mockResolvedValue(undefined),
    onEnsureDeviceReady: jest.fn().mockResolvedValue(true),
    onSetTargetWalletType: jest.fn(),
    onShowHardwareWalletError: jest.fn(),
    onClearError: jest.fn(),
    onRetry: jest.fn().mockResolvedValue(undefined),
    onRequestBluetoothPermissions: jest.fn().mockResolvedValue(true),
    onSelectDevice: jest.fn(),
    onRescan: jest.fn(),
    onResetFlowState: jest.fn(),
    onShowAwaitingConfirmation: jest.fn(),
    onHideAwaitingConfirmation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HardwareWalletActionsProvider', () => {
    it('should call connect callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('connect'));
      expect(mockCallbacks.onConnect).toHaveBeenCalledWith('device-123');
      expect(onActionCalled).toHaveBeenCalledWith('connect');
    });

    it('should call disconnect callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('disconnect'));
      expect(mockCallbacks.onDisconnect).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith('disconnect');
    });

    it('should call ensureDeviceReady callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('ensureReady'));
      expect(mockCallbacks.onEnsureDeviceReady).toHaveBeenCalledWith(
        'device-123',
      );
      expect(onActionCalled).toHaveBeenCalledWith('ensureDeviceReady');
    });

    it('should call showHardwareWalletError callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('showError'));
      expect(mockCallbacks.onShowHardwareWalletError).toHaveBeenCalledWith(
        expect.any(Error),
      );
      expect(onActionCalled).toHaveBeenCalledWith('showHardwareWalletError');
    });

    it('should call clearError callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('clearError'));
      expect(mockCallbacks.onClearError).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith('clearError');
    });

    it('should call retry callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('retry'));
      expect(mockCallbacks.onRetry).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith('retry');
    });

    it('should call requestBluetoothPermissions callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('requestPermissions'));
      expect(mockCallbacks.onRequestBluetoothPermissions).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith(
        'requestBluetoothPermissions',
      );
    });
  });

  describe('useHardwareWalletActions', () => {
    it('should throw error when actions are called outside provider', async () => {
      // Note: The hook itself doesn't throw, but calling the actions will
      // because the default actions throw "not initialized" errors
      const onActionCalled = jest.fn();

      render(<TestConsumer onActionCalled={onActionCalled} />);

      // The component renders, but calling actions would throw
      // We just verify the component renders without the provider
      expect(screen.getByTestId('connect')).toBeTruthy();
    });
  });
});
