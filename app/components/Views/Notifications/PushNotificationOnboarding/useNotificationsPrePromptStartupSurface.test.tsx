import type { ReactElement } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { useNotificationsPrePromptStartupSurface } from './useNotificationsPrePromptStartupSurface';
import { usePushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';

jest.mock(
  '../../../../util/notifications/hooks/usePushPrePromptVariant',
  () => ({
    usePushPrePromptVariant: jest.fn(),
  }),
);

const mockUsePushPrePromptVariant = jest.mocked(usePushPrePromptVariant);
const mockDismiss = jest.fn();
const mockMarkShown = jest.fn();

interface RenderedSurfaceProps {
  onComplete: (reason: 'engage') => void;
  onPendingActionStart: (variant: 'push_permission') => void;
}

describe('useNotificationsPrePromptStartupSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMarkShown.mockResolvedValue(undefined);
    mockUsePushPrePromptVariant.mockReturnValue({
      dismiss: mockDismiss,
      isResolving: false,
      markShown: mockMarkShown,
      variant: 'push_permission',
    });
  });

  it('keeps push eligible while the Yes action waits for OS permission', () => {
    const completeSurface = jest.fn();
    const { result, rerender } = renderHook(() =>
      useNotificationsPrePromptStartupSurface(),
    );

    expect(result.current.status).toBe('eligible');

    const renderedSurface = result.current.render?.({
      completeSurface,
    }) as ReactElement<RenderedSurfaceProps>;

    act(() => {
      renderedSurface?.props.onPendingActionStart('push_permission');
    });

    mockUsePushPrePromptVariant.mockReturnValue({
      dismiss: mockDismiss,
      isResolving: false,
      markShown: mockMarkShown,
      variant: null,
    });
    rerender(undefined);

    expect(result.current.status).toBe('eligible');

    const pendingRenderedSurface = result.current.render?.({
      completeSurface,
    }) as ReactElement<RenderedSurfaceProps>;

    act(() => {
      pendingRenderedSurface?.props.onComplete('engage');
    });

    expect(completeSurface).toHaveBeenCalledWith('push-pre-prompt', 'engage');
  });
});
