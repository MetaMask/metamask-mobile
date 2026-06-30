import React from 'react';
import { render } from '@testing-library/react-native';
import RootRPCMethodsUI from './RootRPCMethodsUI';
import Engine from '../../../core/Engine';

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: { hub: { removeAllListeners: jest.fn() } },
  },
}));

jest.mock('../../Approvals/WatchAssetApproval', () => 'WatchAssetApproval');
jest.mock('../../Approvals/AddChainApproval', () => 'AddChainApproval');
jest.mock('../../Approvals/SwitchChainApproval', () => 'SwitchChainApproval');
jest.mock('../../Approvals/ConnectApproval', () => 'ConnectApproval');
jest.mock('../../Approvals/PermissionApproval', () => 'PermissionApproval');
jest.mock('../../Approvals/FlowLoaderModal', () => 'FlowLoaderModal');
jest.mock(
  '../../Approvals/TemplateConfirmationModal',
  () => 'TemplateConfirmationModal',
);
jest.mock('../../../components/Views/confirmations/components/confirm', () => ({
  ConfirmRoot: 'ConfirmRoot',
}));
jest.mock('../../Approvals/InstallSnapApproval', () => 'InstallSnapApproval');
jest.mock(
  '../../Snaps/SnapDialogApproval/SnapDialogApproval',
  () => 'SnapDialogApproval',
);
jest.mock(
  '../../Approvals/SnapAccountCustomNameApproval',
  () => 'SnapAccountCustomNameApproval',
);

describe('RootRPCMethodsUI', () => {
  it('renders without crashing', () => {
    const mockNavigate = jest.fn();
    const { toJSON } = render(
      <RootRPCMethodsUI navigation={{ navigate: mockNavigate }} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('cleans up TokensController listeners on unmount', () => {
    const mockRemoveAllListeners = jest.fn();
    jest.mocked(Engine).context.TokensController = {
      hub: { removeAllListeners: mockRemoveAllListeners },
    };

    const { unmount } = render(
      <RootRPCMethodsUI navigation={{ navigate: jest.fn() }} />,
    );
    expect(mockRemoveAllListeners).not.toHaveBeenCalled();

    unmount();
    expect(mockRemoveAllListeners).toHaveBeenCalled();
  });
});
