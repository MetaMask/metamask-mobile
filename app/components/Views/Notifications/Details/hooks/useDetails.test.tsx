import { useSelector, useDispatch } from 'react-redux';
import useDetails from './useDetails';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar';
import { mockTheme } from '../../../../../util/theme';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

describe('useDetails', () => {
  const mockUseSelector = useSelector as jest.Mock;
  const mockUseDispatch = useDispatch as jest.Mock;

  beforeEach(() => {
    mockUseSelector.mockReset();
    mockUseDispatch.mockReset();
  });

  it('should return renderNFT, renderTransfer, renderStake, renderStakeReadyToBeWithdrawn and renderSwap functions', () => {
    const { result } = renderHookWithProvider(() =>
      useDetails({
        theme: mockTheme,
        accountAvatarType: AvatarAccountType.JazzIcon,
        navigation: {},
        copyToClipboard: () => Promise.resolve(),
      }),
    );

    const {
      renderNFT,
      renderTransfer,
      renderStake,
      renderStakeReadyToBeWithdrawn,
      renderSwap,
    } = result.current;
    expect(renderNFT).toBeDefined();
    expect(renderTransfer).toBeDefined();
    expect(renderStake).toBeDefined();
    expect(renderStakeReadyToBeWithdrawn).toBeDefined();
    expect(renderSwap).toBeDefined();
  });
});
