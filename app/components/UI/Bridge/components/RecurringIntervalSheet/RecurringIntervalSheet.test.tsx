import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import RecurringIntervalSheet from './RecurringIntervalSheet';
import { RecurringIntervalSheetSelectorsIDs } from './RecurringIntervalSheet.testIds';
import { playSelection } from '../../../../../util/haptics';

jest.mock('../../../../../util/haptics');

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => false),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        { children, testID }: { children?: React.ReactNode; testID?: string },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: jest.fn(),
        }));

        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

describe('RecurringIntervalSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('plays selection feedback when the interval changes', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <RecurringIntervalSheet
        currentUnit="day"
        onSelect={onSelect}
        goBack={jest.fn()}
      />,
    );

    fireEvent.press(
      getByTestId(RecurringIntervalSheetSelectorsIDs.OPTION('week')),
    );

    expect(playSelection).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('week');
  });

  it('keeps the active interval silent', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <RecurringIntervalSheet
        currentUnit="day"
        onSelect={onSelect}
        goBack={jest.fn()}
      />,
    );

    fireEvent.press(
      getByTestId(RecurringIntervalSheetSelectorsIDs.OPTION('day')),
    );

    expect(playSelection).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
