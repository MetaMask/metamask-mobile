import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import LedgerMessageSignModal from './LedgerMessageSignModal';
import { RPCStageTypes } from '../../../reducers/rpcEvents';

// Mock navigation
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn().mockReturnValue(true);

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

// Mock dispatch
const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  };
});

// Mock navigation utils
const mockOnConfirmationComplete = jest.fn();

jest.mock('../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(() => jest.fn()),
  useParams: jest.fn(() => ({
    messageParams: { data: 'test-message' },
    onConfirmationComplete: mockOnConfirmationComplete,
    version: 'V4',
    type: 'eth_signTypedData_v4',
    deviceId: 'test-device-id',
  })),
}));

// Mock LedgerConfirmationModal to capture props
let capturedOnConfirmation: (() => Promise<void>) | null = null;
let capturedOnRejection: (() => void) | null = null;
let capturedOperationType: string | undefined = undefined;

jest.mock('./LedgerConfirmationModal', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const mockReact = require('react');
  return function MockLedgerConfirmationModal({
    onConfirmation,
    onRejection,
    deviceId,
    operationType,
  }: {
    onConfirmation: () => Promise<void>;
    onRejection: () => void;
    deviceId: string;
    operationType?: string;
  }) {
    capturedOnConfirmation = onConfirmation;
    capturedOnRejection = onRejection;
    capturedOperationType = operationType;
    return mockReact.createElement('MockLedgerConfirmationModal', {
      deviceId,
      operationType,
    });
  };
});

const mockStore = configureMockStore();

describe('LedgerMessageSignModal', () => {
  const createStore = (eventStage: RPCStageTypes = RPCStageTypes.IDLE) =>
    mockStore({
      rpcEvents: {
        signingEvent: {
          eventStage,
          rpcName: 'eth_signTypedData_v4',
        },
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnConfirmation = null;
    capturedOnRejection = null;
    capturedOperationType = undefined;
    mockOnConfirmationComplete.mockResolvedValue(undefined);
  });

  it('renders LedgerConfirmationModal with message operationType', () => {
    const store = createStore();

    render(
      <Provider store={store}>
        <LedgerMessageSignModal />
      </Provider>,
    );

    expect(capturedOperationType).toBe('message');
  });

  describe('executeOnLedger', () => {
    it('calls onConfirmationComplete with true', async () => {
      const store = createStore();

      render(
        <Provider store={store}>
          <LedgerMessageSignModal />
        </Provider>,
      );

      expect(capturedOnConfirmation).toBeDefined();
      await capturedOnConfirmation?.();

      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(true);
    });
  });

  describe('onRejection', () => {
    it('calls onConfirmationComplete with false and dispatches resetEventStage', async () => {
      const store = createStore();

      render(
        <Provider store={store}>
          <LedgerMessageSignModal />
        </Provider>,
      );

      expect(capturedOnRejection).toBeDefined();
      await capturedOnRejection?.();

      expect(mockOnConfirmationComplete).toHaveBeenCalledWith(false);
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('auto-close on signing completion', () => {
    it('closes modal when eventStage is COMPLETE', async () => {
      const store = createStore(RPCStageTypes.COMPLETE);

      render(
        <Provider store={store}>
          <LedgerMessageSignModal />
        </Provider>,
      );

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('closes modal when eventStage is ERROR', async () => {
      const store = createStore(RPCStageTypes.ERROR);

      render(
        <Provider store={store}>
          <LedgerMessageSignModal />
        </Provider>,
      );

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('does not close modal when eventStage is IDLE', () => {
      const store = createStore(RPCStageTypes.IDLE);

      render(
        <Provider store={store}>
          <LedgerMessageSignModal />
        </Provider>,
      );

      // goBack should not be called during idle state
      // It's only called through explicit rejection or completion
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  it('handles canGoBack returning false', async () => {
    mockCanGoBack.mockReturnValue(false);
    const store = createStore(RPCStageTypes.COMPLETE);

    render(
      <Provider store={store}>
        <LedgerMessageSignModal />
      </Provider>,
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });

    // goBack is called but does nothing when canGoBack is false
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
