import { renderHook } from '@testing-library/react-hooks';
import { useAccountAvatarType } from './useAccountAvatarType';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  shallowEqual: jest.fn(),
}));

import { useSelector } from 'react-redux';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useAccountAvatarType', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns Blockies avatar type when useBlockieIcon is true', () => {
    mockUseSelector.mockReturnValue(AvatarAccountType.Blockies);

    const { result } = renderHook(() => useAccountAvatarType());

    expect(result.current).toBe(AvatarAccountType.Blockies);
  });

  it('returns JazzIcon avatar type when useBlockieIcon is false', () => {
    mockUseSelector.mockReturnValue(AvatarAccountType.JazzIcon);

    const { result } = renderHook(() => useAccountAvatarType());

    expect(result.current).toBe(AvatarAccountType.JazzIcon);
  });
});
