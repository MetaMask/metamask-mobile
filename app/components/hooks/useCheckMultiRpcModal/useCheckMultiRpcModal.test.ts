import { renderHook } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import useCheckMultiRpcModal from './useCheckMultiRpcModal';
import { setMultiRpcMigrationModalOpen } from '../../../actions/security';
import Routes from '../../../constants/navigation/Routes';
import { isObject } from '@metamask/utils';
import { selectShowMultiRpcModal } from '../../../selectors/preferencesController';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';

// Mock the necessary modules
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@metamask/utils', () => ({
  isObject: jest.fn(),
}));

jest.mock('../../../selectors/preferencesController', () => ({
  selectShowMultiRpcModal: jest.fn(),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

describe('useCheckMultiRpcModal', () => {
  const dispatchMock = jest.fn();
  const navigateMock = jest.fn();

  beforeEach(() => {
    (useDispatch as jest.Mock).mockReturnValue(dispatchMock);
    (useNavigation as jest.Mock).mockReturnValue({ navigate: navigateMock });
    (useSelector as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case selectShowMultiRpcModal:
          return true;
        case selectEvmNetworkConfigurationsByChainId:
          return {
            network1: { rpcEndpoints: ['https://rpc1', 'https://rpc2'] },
            network2: { rpcEndpoints: ['https://rpc3'] },
          };
        default:
          return false;
      }
    });
    (isObject as unknown as jest.Mock).mockImplementation(
      (obj) => typeof obj === 'object' && obj !== null,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should navigate and dispatch action when conditions are met', () => {
    renderHook(() => useCheckMultiRpcModal());

    expect(navigateMock).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.MULTI_RPC_MIGRATION_MODAL,
    });
    expect(dispatchMock).toHaveBeenCalledWith(
      setMultiRpcMigrationModalOpen(true),
    );
  });

  it('should not navigate or dispatch action when conditions are not met', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      switch (selector) {
        case selectShowMultiRpcModal:
          return false;
        case selectEvmNetworkConfigurationsByChainId:
          return {
            network1: { rpcEndpoints: ['https://rpc1'] },
            network2: { rpcEndpoints: ['https://rpc3'] },
          };
        default:
          return false;
      }
    });

    renderHook(() => useCheckMultiRpcModal());

    expect(navigateMock).not.toHaveBeenCalled();
    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
