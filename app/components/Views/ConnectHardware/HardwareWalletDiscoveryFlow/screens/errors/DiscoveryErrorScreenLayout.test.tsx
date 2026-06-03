import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DiscoveryErrorScreenLayout from './DiscoveryErrorScreenLayout';
import {
  __mockRiveFireState,
  __resetAllMocks,
} from '../../../../../../__mocks__/rive-react-native';
import Logger from '../../../../../../util/Logger';

jest.mock('../../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...args: unknown[]) => args.filter(Boolean).join(' '),
  }),
}));

describe('DiscoveryErrorScreenLayout', () => {
  beforeEach(() => {
    __resetAllMocks();
  });

  it('renders title and subtitle', () => {
    render(
      <DiscoveryErrorScreenLayout
        title="Error Title"
        subtitle="Error description"
        testID="test-layout"
      />,
    );

    expect(screen.getByText('Error Title')).toBeOnTheScreen();
    expect(screen.getByText('Error description')).toBeOnTheScreen();
  });

  it('renders image when imageSource is provided', () => {
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        imageSource={{ uri: 'test-image.png' }}
        testID="image-test"
      />,
    );

    expect(screen.getByTestId('image-test')).toBeOnTheScreen();
  });

  it('renders rive animation when no imageSource is provided', () => {
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        artboardName="Ledger"
        stateMachineName="Ledger_states"
        stateTrigger="error"
        testID="rive-test"
      />,
    );

    expect(screen.getByTestId('rive-test')).toBeOnTheScreen();
  });

  it('uses default testID for image when none provided', () => {
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        imageSource={{ uri: 'test.png' }}
      />,
    );

    expect(screen.getByTestId('discovery-error-image')).toBeOnTheScreen();
  });

  it('uses default testID for rive when none provided', () => {
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        artboardName="Ledger"
        stateMachineName="Ledger_states"
        stateTrigger="error"
      />,
    );

    expect(screen.getByTestId('discovery-error-animation')).toBeOnTheScreen();
  });

  it('renders primary button when provided', () => {
    const onPress = jest.fn();
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        primaryButton={{ label: 'Retry', onPress, testID: 'primary-btn' }}
      />,
    );

    expect(screen.getByTestId('primary-btn')).toBeOnTheScreen();
    expect(screen.getByText('Retry')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('primary-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders secondary button when provided', () => {
    const onPress = jest.fn();
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        secondaryButton={{ label: 'Not Now', onPress, testID: 'secondary-btn' }}
      />,
    );

    expect(screen.getByTestId('secondary-btn')).toBeOnTheScreen();
    expect(screen.getByText('Not Now')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('secondary-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render buttons when not provided', () => {
    render(<DiscoveryErrorScreenLayout title="Title" subtitle="Sub" />);

    expect(screen.queryByTestId('primary-btn')).toBeNull();
    expect(screen.queryByTestId('secondary-btn')).toBeNull();
  });

  it('fires rive state trigger on play', () => {
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        artboardName="Ledger"
        stateMachineName="Ledger_states"
        stateTrigger="error"
      />,
    );

    expect(__mockRiveFireState).toHaveBeenCalledWith('Ledger_states', 'error');
  });

  it('does not fire rive state when stateTrigger is missing', () => {
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        artboardName="Ledger"
        stateMachineName="Ledger_states"
      />,
    );

    expect(__mockRiveFireState).not.toHaveBeenCalled();
  });

  it('does not fire rive state when stateMachineName is missing', () => {
    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        artboardName="Ledger"
        stateTrigger="error"
      />,
    );

    expect(__mockRiveFireState).not.toHaveBeenCalled();
  });

  it('logs error when rive fireState throws', () => {
    __mockRiveFireState.mockImplementation(() => {
      throw new Error('Rive error');
    });

    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        artboardName="Ledger"
        stateMachineName="Ledger_states"
        stateTrigger="error"
      />,
    );

    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Error triggering error Rive animation',
    );
  });

  it('renders both primary and secondary buttons together', () => {
    const primaryPress = jest.fn();
    const secondaryPress = jest.fn();

    render(
      <DiscoveryErrorScreenLayout
        title="Title"
        subtitle="Sub"
        primaryButton={{
          label: 'Primary',
          onPress: primaryPress,
          testID: 'p-btn',
        }}
        secondaryButton={{
          label: 'Secondary',
          onPress: secondaryPress,
          testID: 's-btn',
        }}
      />,
    );

    expect(screen.getByTestId('p-btn')).toBeOnTheScreen();
    expect(screen.getByTestId('s-btn')).toBeOnTheScreen();
  });
});
