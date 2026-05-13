import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import StartupSurfaceCoordinator, {
  StartupSurfaceOrchestrator,
  type StartupSurfaceDescriptor,
  type StartupSurfaceStatus,
} from '.';
import { useStartupSurface } from './context';

const mockPerpsPresent = jest.fn();
const mockPredictPresent = jest.fn();

const SurfaceControls = ({
  initialPerpsStatus = 'eligible',
  initialPredictStatus = 'ineligible',
}: {
  initialPerpsStatus?: StartupSurfaceStatus;
  initialPredictStatus?: StartupSurfaceStatus;
}) => {
  const { activeSurfaceId, completeSurface } = useStartupSurface();
  const [pushStatus, setPushStatus] =
    useState<StartupSurfaceStatus>('resolving');
  const [perpsStatus] = useState<StartupSurfaceStatus>(initialPerpsStatus);
  const [predictStatus] = useState<StartupSurfaceStatus>(initialPredictStatus);

  const surfaces = useMemo<StartupSurfaceDescriptor[]>(
    () => [
      {
        id: 'push-pre-prompt',
        render: () => <View testID="push-surface" />,
        status: pushStatus,
      },
      {
        id: 'perps-gtm',
        present: mockPerpsPresent,
        status: perpsStatus,
      },
      {
        id: 'predict-gtm',
        present: mockPredictPresent,
        status: predictStatus,
      },
    ],
    [perpsStatus, predictStatus, pushStatus],
  );

  return (
    <View>
      <StartupSurfaceOrchestrator surfaces={surfaces} />
      <Text testID="active-surface">{activeSurfaceId ?? 'none'}</Text>
      <Pressable
        testID="push-eligible"
        onPress={() => setPushStatus('eligible')}
      />
      <Pressable
        testID="push-ineligible"
        onPress={() => setPushStatus('ineligible')}
      />
      <Pressable
        testID="complete-push"
        onPress={() => completeSurface('push-pre-prompt', 'dismiss')}
      />
      <Pressable
        testID="complete-perps"
        onPress={() => completeSurface('perps-gtm', 'dismiss')}
      />
    </View>
  );
};

const renderCoordinator = (
  props?: React.ComponentProps<typeof SurfaceControls>,
) =>
  renderWithProvider(
    <StartupSurfaceCoordinator>
      <SurfaceControls {...props} />
    </StartupSurfaceCoordinator>,
  );

describe('StartupSurfaceCoordinator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows push before Perps, then queues Perps after push completes', async () => {
    const { getByTestId } = renderCoordinator();

    expect(mockPerpsPresent).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('push-eligible'));

    await waitFor(() => {
      expect(getByTestId('active-surface').props.children).toBe(
        'push-pre-prompt',
      );
    });
    expect(mockPerpsPresent).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('complete-push'));

    await waitFor(() => {
      expect(mockPerpsPresent).toHaveBeenCalledTimes(1);
    });
  });

  it('opens Perps when push is ineligible and Perps is eligible', async () => {
    const { getByTestId } = renderCoordinator();

    fireEvent.press(getByTestId('push-ineligible'));

    await waitFor(() => {
      expect(mockPerpsPresent).toHaveBeenCalledTimes(1);
    });
  });

  it('queues Predict behind Perps when both are eligible', async () => {
    const { getByTestId } = renderCoordinator({
      initialPredictStatus: 'eligible',
    });

    fireEvent.press(getByTestId('push-ineligible'));

    await waitFor(() => {
      expect(mockPerpsPresent).toHaveBeenCalledTimes(1);
    });
    expect(mockPredictPresent).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('complete-perps'));

    await waitFor(() => {
      expect(mockPredictPresent).toHaveBeenCalledTimes(1);
    });
  });

  it('does not reopen a completed Perps surface in the same session', async () => {
    const { getByTestId } = renderCoordinator();

    fireEvent.press(getByTestId('push-ineligible'));

    await waitFor(() => {
      expect(mockPerpsPresent).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(getByTestId('complete-perps'));
    fireEvent.press(getByTestId('push-ineligible'));

    expect(mockPerpsPresent).toHaveBeenCalledTimes(1);
  });
});
