import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import SnapDialogApproval from './index';
import Engine from '../../../core/Engine';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { DIALOG_APPROVAL_TYPES } from '@metamask/snaps-rpc-methods';

jest.mock('../SnapUIRenderer/SnapUIRenderer', () => ({
  SnapUIRenderer: () => null,
}));

jest.mock('../../../core/Engine', () => ({
  acceptPendingApproval: jest.fn(),
  context: {
    SnapInterfaceController: {
      deleteInterface: jest.fn(),
    },
  },
}));

jest.mock('../../Views/confirmations/hooks/useApprovalRequest');

const mockStore = configureMockStore();
const store = mockStore({});

const renderComponent = (component: React.ReactElement) =>
  render(<Provider store={store}>{component}</Provider>);

describe('SnapDialogApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockApprovalRequest = (type: string) => ({
    id: 'test-id',
    type,
    origin: 'test-snap-id',
    requestData: {
      id: 'test-interface-id',
    },
  });

  describe('Alert Dialog', () => {
    beforeEach(() => {
      (useApprovalRequest as jest.Mock).mockReturnValue({
        approvalRequest: mockApprovalRequest(DIALOG_APPROVAL_TYPES.alert),
      });
    });

    it('render alert dialog with OK button', () => {
      const { getByText } = renderComponent(<SnapDialogApproval />);
      expect(getByText('OK')).toBeTruthy();
    });

    it('handle OK button press', async () => {
      const { getByText } = renderComponent(<SnapDialogApproval />);
      await fireEvent.press(getByText('OK'));

      expect(Engine.acceptPendingApproval).toHaveBeenCalledWith(
        'test-id',
        null,
      );
      expect(
        Engine.context.SnapInterfaceController.deleteInterface,
      ).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Default Dialog', () => {
    beforeEach(() => {
      (useApprovalRequest as jest.Mock).mockReturnValue({
        approvalRequest: mockApprovalRequest(DIALOG_APPROVAL_TYPES.default),
      });
    });

    it('render default dialog without buttons', () => {
      const { queryByText } = renderComponent(<SnapDialogApproval />);
      expect(queryByText('OK')).toBeNull();
      expect(queryByText('Cancel')).toBeNull();
    });
  });

  describe('Invalid Dialog Type', () => {
    it('return null for invalid dialog type', () => {
      (useApprovalRequest as jest.Mock).mockReturnValue({
        approvalRequest: mockApprovalRequest('invalid_type'),
      });

      const { queryByTestId } = renderComponent(<SnapDialogApproval />);
      expect(queryByTestId('snap-dialog-approval')).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('handle loading state during cancel operation', async () => {
      (useApprovalRequest as jest.Mock).mockReturnValue({
        approvalRequest: mockApprovalRequest(DIALOG_APPROVAL_TYPES.alert),
      });

      const { getByText } = renderComponent(<SnapDialogApproval />);
      const okButton = getByText('OK');

      await fireEvent.press(okButton);
      expect(Engine.acceptPendingApproval).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Approval Request', () => {
    it('handle undefined approval request', () => {
      (useApprovalRequest as jest.Mock).mockReturnValue({
        approvalRequest: undefined,
      });

      const { queryByTestId } = renderComponent(<SnapDialogApproval />);
      expect(queryByTestId('snap-dialog-approval')).toBeNull();
    });
  });
});
