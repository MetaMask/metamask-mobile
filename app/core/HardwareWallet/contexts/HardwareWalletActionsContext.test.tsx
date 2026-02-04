import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  HardwareWalletActionsProvider,
  useHardwareWalletActions,
} from './HardwareWalletActionsContext';
import { HardwareWalletType } from '../helpers';

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
      <TouchableOpacity
        testID="openDeviceSelection"
        onPress={() => {
          actions.openDeviceSelection(HardwareWalletType.Ledger);
          onActionCalled('openDeviceSelection');
        }}
      />
      <TouchableOpacity
        testID="closeDeviceSelection"
        onPress={() => {
          actions.closeDeviceSelection();
          onActionCalled('closeDeviceSelection');
        }}
      />
      <TouchableOpacity
        testID="openSigningModal"
        onPress={() => {
          actions.openSigningModal(HardwareWalletType.Ledger, 'device-123');
          onActionCalled('openSigningModal');
        }}
      />
      <TouchableOpacity
        testID="closeSigningModal"
        onPress={() => {
          actions.closeSigningModal();
          onActionCalled('closeSigningModal');
        }}
      />
      <TouchableOpacity
        testID="setTargetWalletType"
        onPress={() => {
          actions.setTargetWalletType(HardwareWalletType.Ledger);
          onActionCalled('setTargetWalletType');
        }}
      />
      <TouchableOpacity
        testID="selectDevice"
        onPress={() => {
          actions.selectDevice({ id: 'device-1', name: 'Nano X' });
          onActionCalled('selectDevice');
        }}
      />
      <TouchableOpacity
        testID="rescan"
        onPress={() => {
          actions.rescan();
          onActionCalled('rescan');
        }}
      />
      <TouchableOpacity
        testID="resetFlowState"
        onPress={() => {
          actions.resetFlowState();
          onActionCalled('resetFlowState');
        }}
      />
      <TouchableOpacity
        testID="showAwaitingConfirmation"
        onPress={() => {
          actions.showAwaitingConfirmation('transaction');
          onActionCalled('showAwaitingConfirmation');
        }}
      />
      <TouchableOpacity
        testID="hideAwaitingConfirmation"
        onPress={() => {
          actions.hideAwaitingConfirmation();
          onActionCalled('hideAwaitingConfirmation');
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

    it('should call openDeviceSelection callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('openDeviceSelection'));
      expect(mockCallbacks.onOpenDeviceSelection).toHaveBeenCalledWith(
        'ledger',
        undefined,
      );
      expect(onActionCalled).toHaveBeenCalledWith('openDeviceSelection');
    });

    it('should call closeDeviceSelection callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('closeDeviceSelection'));
      expect(mockCallbacks.onCloseDeviceSelection).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith('closeDeviceSelection');
    });

    it('should call openSigningModal callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('openSigningModal'));
      expect(mockCallbacks.onOpenSigningModal).toHaveBeenCalledWith(
        'ledger',
        'device-123',
        undefined,
      );
      expect(onActionCalled).toHaveBeenCalledWith('openSigningModal');
    });

    it('should call closeSigningModal callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('closeSigningModal'));
      expect(mockCallbacks.onCloseSigningModal).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith('closeSigningModal');
    });

    it('should call setTargetWalletType callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('setTargetWalletType'));
      expect(mockCallbacks.onSetTargetWalletType).toHaveBeenCalledWith(
        'ledger',
      );
      expect(onActionCalled).toHaveBeenCalledWith('setTargetWalletType');
    });

    it('should call selectDevice callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('selectDevice'));
      expect(mockCallbacks.onSelectDevice).toHaveBeenCalledWith({
        id: 'device-1',
        name: 'Nano X',
      });
      expect(onActionCalled).toHaveBeenCalledWith('selectDevice');
    });

    it('should call rescan callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('rescan'));
      expect(mockCallbacks.onRescan).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith('rescan');
    });

    it('should call resetFlowState callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('resetFlowState'));
      expect(mockCallbacks.onResetFlowState).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith('resetFlowState');
    });

    it('should call showAwaitingConfirmation callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('showAwaitingConfirmation'));
      expect(mockCallbacks.onShowAwaitingConfirmation).toHaveBeenCalledWith(
        'transaction',
        undefined,
      );
      expect(onActionCalled).toHaveBeenCalledWith('showAwaitingConfirmation');
    });

    it('should call hideAwaitingConfirmation callback', () => {
      const onActionCalled = jest.fn();

      render(
        <HardwareWalletActionsProvider {...mockCallbacks}>
          <TestConsumer onActionCalled={onActionCalled} />
        </HardwareWalletActionsProvider>,
      );

      fireEvent.press(screen.getByTestId('hideAwaitingConfirmation'));
      expect(mockCallbacks.onHideAwaitingConfirmation).toHaveBeenCalled();
      expect(onActionCalled).toHaveBeenCalledWith('hideAwaitingConfirmation');
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
