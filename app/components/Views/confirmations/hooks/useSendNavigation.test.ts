import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  rffSendRedesignDisabledMock,
  rffSendRedesignEnabledMock,
} from '../__mocks__/controllers/remote-feature-flag-controller.mock';

import { AssetType } from '../types/token';
import { InitSendLocation } from '../constants/send';
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
      it('passes recipientAddress through extraParams when provided', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: rffSendRedesignEnabledMock,
        });
        const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';

        result.current.navigateToSendPage(
          InitSendLocation.QRScanner,
          undefined,
          { recipientAddress },
        );

        expect(mockNavigate).toHaveBeenCalledWith('Send', {
          screen: 'Asset',
          params: {
            asset: undefined,
            recipientAddress,
          },
        });
      });

      it('navigates to send page without extraParams when not provided', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: rffSendRedesignEnabledMock,
        });

        result.current.navigateToSendPage(InitSendLocation.AssetOverview, {
          name: 'ETHEREUM',
        } as AssetType);

        expect(mockNavigate).toHaveBeenCalledWith('Send', {
          screen: 'Amount',
          params: {
            asset: {
              name: 'ETHEREUM',
            },
          },
        });
      });

      it('passes both asset and recipientAddress when both provided', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: rffSendRedesignEnabledMock,
        });
        const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';
        const asset = { name: 'ETHEREUM' } as AssetType;

        result.current.navigateToSendPage(InitSendLocation.QRScanner, asset, {
          recipientAddress,
        });

        expect(mockNavigate).toHaveBeenCalledWith('Send', {
          screen: 'Amount',
          params: {
            asset,
            recipientAddress,
          },
        });
      });

      it('handles empty recipientAddress in extraParams', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: rffSendRedesignEnabledMock,
        });

        result.current.navigateToSendPage(
          InitSendLocation.QRScanner,
          undefined,
          {
            recipientAddress: '',
          },
        );

        expect(mockNavigate).toHaveBeenCalledWith('Send', {
          screen: 'Asset',
          params: {
            asset: undefined,
            recipientAddress: '',
          },
        });
      });

      it('works with send redesign disabled and extraParams provided', () => {
        const { result } = renderHookWithProvider(() => useSendNavigation(), {
          state: mockState,
        });
        const recipientAddress = '0x97A5b8a38f376B8a0C3C16e0A927b5b02dEf0576';

        result.current.navigateToSendPage(
          InitSendLocation.QRScanner,
          undefined,
          { recipientAddress },
        );

        // When send redesign is disabled, it always navigates to SendFlowView
        expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
      });
    });
  });
});
