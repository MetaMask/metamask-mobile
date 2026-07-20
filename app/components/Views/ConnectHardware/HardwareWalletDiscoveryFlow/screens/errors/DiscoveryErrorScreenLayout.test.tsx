import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import DiscoveryErrorScreenLayout from './DiscoveryErrorScreenLayout';
import type { DiscoveryErrorScreenLayoutProps } from './DiscoveryErrorScreen.types';
import {
  __mockRiveFireState,
  __resetAllMocks,
} from '../../../../../../__mocks__/rive-react-native';
import Logger from '../../../../../../util/Logger';
import {
  LEDGER_ARTBOARD_NAME,
  LEDGER_RIVE_STATE_TRIGGER,
  LEDGER_STATE_MACHINE_NAME,
} from '../../../ledgerRiveConstants';

jest.mock('../../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const DEFAULT_IMAGE_TEST_ID = 'discovery-error-image';
const DEFAULT_RIVE_TEST_ID = 'discovery-error-animation';

const renderLayout = (props: DiscoveryErrorScreenLayoutProps) =>
  renderWithProvider(
    <DiscoveryErrorScreenLayout {...props} />,
    undefined,
    false,
  );

const BASE_PROPS: DiscoveryErrorScreenLayoutProps = {
  title: 'Title',
  subtitle: 'Sub',
};

const RIVE_PROPS: DiscoveryErrorScreenLayoutProps = {
  ...BASE_PROPS,
  artboardName: LEDGER_ARTBOARD_NAME,
  stateMachineName: LEDGER_STATE_MACHINE_NAME,
  stateTrigger: LEDGER_RIVE_STATE_TRIGGER.Error,
};

describe('DiscoveryErrorScreenLayout', () => {
  beforeEach(() => {
    __resetAllMocks();
  });

  it('renders title and subtitle', () => {
    renderLayout({ ...BASE_PROPS, testID: 'test-layout' });

    expect(screen.getByText('Title')).toBeOnTheScreen();
    expect(screen.getByText('Sub')).toBeOnTheScreen();
  });

  describe('media rendering', () => {
    it('renders image when imageSource is provided', () => {
      renderLayout({
        ...BASE_PROPS,
        imageSource: { uri: 'test.png' },
        testID: 'image-test',
      });
      expect(screen.getByTestId('image-test')).toBeOnTheScreen();
    });

    it('renders rive animation when no imageSource is provided', () => {
      renderLayout({ ...RIVE_PROPS, testID: 'rive-test' });
      expect(screen.getByTestId('rive-test')).toBeOnTheScreen();
    });

    it.each([
      {
        overrideProps: { imageSource: { uri: 'test.png' } },
        expectedTestID: DEFAULT_IMAGE_TEST_ID,
      },
      {
        overrideProps: {
          artboardName: LEDGER_ARTBOARD_NAME,
          stateMachineName: LEDGER_STATE_MACHINE_NAME,
          stateTrigger: LEDGER_RIVE_STATE_TRIGGER.Error,
        },
        expectedTestID: DEFAULT_RIVE_TEST_ID,
      },
    ])(
      'uses default testID $expectedTestID when none provided',
      ({ overrideProps, expectedTestID }) => {
        renderLayout({ ...BASE_PROPS, ...overrideProps });
        expect(screen.getByTestId(expectedTestID)).toBeOnTheScreen();
      },
    );
  });

  describe('buttons', () => {
    it('renders primary button and fires onPress', () => {
      const onPress = jest.fn();
      renderLayout({
        ...BASE_PROPS,
        primaryButton: { label: 'Retry', onPress, testID: 'primary-btn' },
      });

      fireEvent.press(screen.getByTestId('primary-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders secondary button and fires onPress', () => {
      const onPress = jest.fn();
      renderLayout({
        ...BASE_PROPS,
        secondaryButton: { label: 'Not Now', onPress, testID: 'secondary-btn' },
      });

      fireEvent.press(screen.getByTestId('secondary-btn'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('renders both buttons together', () => {
      renderLayout({
        ...BASE_PROPS,
        primaryButton: { label: 'P', onPress: jest.fn(), testID: 'p-btn' },
        secondaryButton: { label: 'S', onPress: jest.fn(), testID: 's-btn' },
      });

      expect(screen.getByTestId('p-btn')).toBeOnTheScreen();
      expect(screen.getByTestId('s-btn')).toBeOnTheScreen();
    });

    it('does not render buttons when not provided', () => {
      renderLayout(BASE_PROPS);
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('rive state triggering', () => {
    it('fires state trigger on play', () => {
      renderLayout(RIVE_PROPS);
      expect(__mockRiveFireState).toHaveBeenCalledWith(
        LEDGER_STATE_MACHINE_NAME,
        LEDGER_RIVE_STATE_TRIGGER.Error,
      );
    });

    it.each([
      {
        label: 'stateTrigger',
        overrideProps: {
          artboardName: LEDGER_ARTBOARD_NAME,
          stateMachineName: LEDGER_STATE_MACHINE_NAME,
        },
      },
      {
        label: 'stateMachineName',
        overrideProps: {
          artboardName: LEDGER_ARTBOARD_NAME,
          stateTrigger: LEDGER_RIVE_STATE_TRIGGER.Error,
        },
      },
    ])('does not fire state when $label is missing', ({ overrideProps }) => {
      renderLayout({ ...BASE_PROPS, ...overrideProps });
      expect(__mockRiveFireState).not.toHaveBeenCalled();
    });

    it('logs error when fireState throws', () => {
      __mockRiveFireState.mockImplementation(() => {
        throw new Error('Rive error');
      });

      renderLayout(RIVE_PROPS);

      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Error triggering error Rive animation',
      );
    });
  });
});
