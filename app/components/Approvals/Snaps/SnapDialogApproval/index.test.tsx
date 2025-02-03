import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import SnapDialogApproval from './index';
import Engine from '../../../../core/Engine';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';

const mockStore = configureMockStore();
const store = mockStore({
  engine: {
    snapState: {
      interfaces: {
        'interface-id': {
          'custom-input': 'test-input',
        },
      },
    },
  },
});

jest.mock('../../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  context: {
    SnapInterfaceController: {
      getInterface: jest.fn(),
    },
  },
}));

jest.mock('../../../Views/confirmations/hooks/useApprovalRequest');

jest.mock('../../../../selectors/snaps/interfaceController', () => ({
  getMemoizedInterface: () => ({
    'custom-input': 'test-input',
  }),
  getInterface: () => ({
    'custom-input': 'test-input',
  }),
}));

const renderWithProvider = (component: React.ReactElement) =>
  render(<Provider store={store}>{component}</Provider>);

describe('SnapDialogApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.clearActions();
  });

  const mockApprovalRequest = (type: string) => ({
    id: 'test-id',
    type,
    origin: 'snap-id',
    requestData: {
      id: 'interface-id',
    },
  });

  describe('Alert Dialog', () => {
    beforeEach(() => {
      (useApprovalRequest as jest.Mock).mockReturnValue({
        approvalRequest: mockApprovalRequest('snap_dialog:alert'),
      });
    });

    it('renders alert dialog with OK button', () => {
      const { getByText } = renderWithProvider(<SnapDialogApproval />);
      expect(getByText('OK')).toBeTruthy();
    });

    it('handles OK button press', async () => {
      const { getByText } = renderWithProvider(<SnapDialogApproval />);
      await fireEvent.press(getByText('OK'));
      expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
        'test-id',
        null,
      );
    });
  });

  describe('Confirmation Dialog', () => {
    beforeEach(() => {
      (useApprovalRequest as jest.Mock).mockReturnValue({
        approvalRequest: mockApprovalRequest('snap_dialog:confirmation'),
      });
    });

    it('renders confirmation dialog with OK and Cancel buttons', () => {
      const { getByText } = renderWithProvider(<SnapDialogApproval />);
      expect(getByText('OK')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('handles confirmation', async () => {
      const { getByText } = renderWithProvider(<SnapDialogApproval />);
      await fireEvent.press(getByText('OK'));
      expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
        'test-id',
        true,
      );
    });

    it('handles rejection', async () => {
      const { getByText } = renderWithProvider(<SnapDialogApproval />);
      await fireEvent.press(getByText('Cancel'));
      expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
        'test-id',
        false,
      );
    });
  });

  describe('Invalid Dialog Type', () => {
    it('returns null for invalid dialog type', () => {
      (useApprovalRequest as jest.Mock).mockReturnValue({
        approvalRequest: mockApprovalRequest('invalid_type'),
      });

      const { queryByText } = renderWithProvider(<SnapDialogApproval />);
      expect(queryByText('OK')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
    });
  });
});
