import React from 'react';
import { render, act } from '@testing-library/react-native';

import {
  SuccessContent,
  SUCCESS_CONTENT_TEST_ID,
  SUCCESS_CONTENT_ICON_TEST_ID,
} from './SuccessContent';
import { HardwareWalletType } from '../../../helpers';

// Mock dependencies
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#FFFFFF', alternative: '#F2F4F6' },
      text: { default: '#24272A', alternative: '#6A737D' },
      success: { default: '#28A745' },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock component library
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: { BodyMD: 'BodyMD' },
    TextColor: { Default: 'Default' },
  };
});

jest.mock(
  '../../../../../component-library/components/Sheet/SheetHeader',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ title }: { title: string }) => <Text>{title}</Text>,
    };
  },
);

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
    IconName: { CheckBold: 'CheckBold' },
    IconSize: { Xl: 'Xl' },
    IconColor: { Success: 'Success' },
  };
});

describe('SuccessContent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render with test ID', () => {
    const { getByTestId } = render(<SuccessContent />);

    expect(getByTestId(SUCCESS_CONTENT_TEST_ID)).toBeTruthy();
  });

  it('should render success icon', () => {
    const { getByTestId } = render(<SuccessContent />);

    expect(getByTestId(SUCCESS_CONTENT_ICON_TEST_ID)).toBeTruthy();
  });

  it('should render default message', () => {
    const { getByText } = render(<SuccessContent />);

    // Component renders hardware_wallet.success.title with device param
    expect(getByText('hardware_wallet.success.title')).toBeTruthy();
  });

  it('should render with device type', () => {
    const { getByText } = render(
      <SuccessContent deviceType={HardwareWalletType.Ledger} />,
    );

    // Component renders hardware_wallet.success.title with device param
    expect(getByText('hardware_wallet.success.title')).toBeTruthy();
  });

  it('should not render any button (auto-dismiss only)', () => {
    const onDismiss = jest.fn();
    const { queryByText } = render(<SuccessContent onDismiss={onDismiss} />);

    // No button should be rendered - success auto-dismisses
    expect(queryByText('hardware_wallet.success.done')).toBeNull();
    expect(queryByText('hardware_wallet.common.continue')).toBeNull();
  });

  it('should auto-dismiss after specified time', () => {
    const onDismiss = jest.fn();
    render(<SuccessContent onDismiss={onDismiss} autoDismissMs={1000} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should not auto-dismiss when autoDismissMs is 0', () => {
    const onDismiss = jest.fn();
    render(<SuccessContent onDismiss={onDismiss} autoDismissMs={0} />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should not auto-dismiss when onDismiss not provided', () => {
    // This should not throw
    render(<SuccessContent autoDismissMs={1000} />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // No error should occur
  });
});
