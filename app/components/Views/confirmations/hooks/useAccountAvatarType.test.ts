import { renderHook } from '@testing-library/react-hooks';
import { useAccountAvatarType } from './useAccountAvatarType';

const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

describe('useAccountAvatarType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Blockies avatar type when selectAvatarAccountType is Blockies', () => {
    mockUseSelector.mockReturnValue('Blockies');

    const { result } = renderHook(() => useAccountAvatarType());

    expect(result.current).toBe('Blockies');
  });

  it('returns JazzIcon avatar type when selectAvatarAccountType is JazzIcon', () => {
    mockUseSelector.mockReturnValue('JazzIcon');

    const { result } = renderHook(() => useAccountAvatarType());

    expect(result.current).toBe('JazzIcon');
  });

  it('returns MaskIcon avatar type when selectAvatarAccountType is MaskIcon', () => {
    mockUseSelector.mockReturnValue('Maskicon');

    const { result } = renderHook(() => useAccountAvatarType());

    expect(result.current).toBe('Maskicon');
  });
});
