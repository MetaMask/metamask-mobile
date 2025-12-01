import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  rffSendRedesignDisabledMock,
  rffSendRedesignEnabledMock,
} from '../__mocks__/controllers/remote-feature-flag-controller.mock';

import { AssetType } from '../types/token';
import { InitSendLocation } from '../constants/send';
import { ChainType } from '../utils/send';
import { useSendNavigation } from './useSendNavigation';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockState = rffSendRedesignDisabledMock;

describe('useSendNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('return function to navigate to send page', () => {
    const { result } = renderHookWithProvider(() => useSendNavigation(), {
      state: mockState,
    });
    expect(result.current.navigateToSendPage).toBeDefined();
  });

  describe('navigateToSendPage', () => {
    it('navigates to send page if send redesign is disabled', () => {
      const { result } = renderHookWithProvider(() => useSendNavigation(), {
        state: mockState,
      });
      result.current.navigateToSendPage({
        location: InitSendLocation.AssetOverview,
        asset: { name: 'ETHEREUM' } as AssetType,
      });
      expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
    });

    it('navigates to send page if send redesign is enabled', () => {
      const { result } = renderHookWithProvider(() => useSendNavigation(), {
        state: rffSendRedesignEnabledMock,
      });
      result.current.navigateToSendPage({
        location: InitSendLocation.AssetOverview,
        asset: { name: 'ETHEREUM' } as AssetType,
      });
      expect(mockNavigate.mock.calls[0][0]).toEqual('Send');
    });

    describe('with extraParams', () => {
      it('passes recipientAddress through predefinedRecipient when provided', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: rffSendRedesignEnabledMock,
        });
        const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';

        result.current.navigateToSendPage({
          location: InitSendLocation.QRScanner,
          predefinedRecipient: {
            address: recipientAddress,
            chainType: ChainType.EVM,
          },
        });

        expect(mockNavigate).toHaveBeenCalledWith('Send', {
          screen: 'Asset',
          params: {
            asset: undefined,
            location: InitSendLocation.QRScanner,
            predefinedRecipient: {
              address: recipientAddress,
              chainType: ChainType.EVM,
            },
          },
        });
      });

      it('navigates to send page without predefinedRecipient when not provided', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: rffSendRedesignEnabledMock,
        });

        result.current.navigateToSendPage({
          location: InitSendLocation.AssetOverview,
          asset: {
            name: 'ETHEREUM',
          } as AssetType,
        });

        expect(mockNavigate).toHaveBeenCalledWith('Send', {
          screen: 'Amount',
          params: {
            asset: {
              name: 'ETHEREUM',
            },
            location: InitSendLocation.AssetOverview,
            predefinedRecipient: undefined,
          },
        });
      });

      it('passes both asset and predefinedRecipient when both provided', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: rffSendRedesignEnabledMock,
        });
        const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';
        const asset = { name: 'ETHEREUM' } as AssetType;

        result.current.navigateToSendPage({
          location: InitSendLocation.QRScanner,
          asset,
          predefinedRecipient: {
            address: recipientAddress,
            chainType: ChainType.EVM,
          },
        });

        expect(mockNavigate).toHaveBeenCalledWith('Send', {
          screen: 'Amount',
          params: {
            asset,
            location: InitSendLocation.QRScanner,
            predefinedRecipient: {
              address: recipientAddress,
              chainType: ChainType.EVM,
            },
          },
        });
      });

      it('handles empty recipientAddress in predefinedRecipient', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: rffSendRedesignEnabledMock,
        });

        result.current.navigateToSendPage({
          location: InitSendLocation.QRScanner,
          predefinedRecipient: {
            address: '',
            chainType: ChainType.EVM,
          },
        });

        expect(mockNavigate).toHaveBeenCalledWith('Send', {
          screen: 'Asset',
          params: {
            asset: undefined,
            location: InitSendLocation.QRScanner,
            predefinedRecipient: {
              address: '',
              chainType: ChainType.EVM,
            },
          },
        });
      });

      it('works with send redesign disabled and predefinedRecipient provided', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: mockState,
        });
        const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';

        result.current.navigateToSendPage({
          location: InitSendLocation.QRScanner,
          predefinedRecipient: {
            address: recipientAddress,
            chainType: ChainType.EVM,
          },
        });

        // When send redesign is disabled, it always navigates to SendFlowView
        expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
      });
    });
  });
});
