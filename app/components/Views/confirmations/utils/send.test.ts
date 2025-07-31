import { AssetType } from '../types/token';
import { handleSendPageNavigation } from './send';

describe('handleSendPageNavigation', () => {
  it('navigates to send page', () => {
    const mockNavigate = jest.fn();
    handleSendPageNavigation(mockNavigate, { name: 'ETHEREUM' } as AssetType);
    expect(mockNavigate).toHaveBeenCalledWith('SendFlowView');
  });
});
