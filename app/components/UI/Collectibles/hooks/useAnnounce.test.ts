import { AccessibilityInfo } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useAnnounce } from '#app/components/UI/Collectibles/hooks/useAnnounce';

describe('useAnnounce', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('announces the message when the condition is true', () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(jest.fn());

    renderHook(() => useAnnounce(true, 'No packs'));

    expect(announce).toHaveBeenCalledWith('No packs');
  });

  it('stays silent when the condition is false', () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(jest.fn());

    renderHook(() => useAnnounce(false, 'No packs'));

    expect(announce).not.toHaveBeenCalled();
  });
});
