import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import CardDateField from './CardDateField';

jest.mock('@react-native-community/datetimepicker', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ({ onChange }: { onChange: (event: unknown, date?: Date) => void }) =>
    ReactActual.createElement(View, {
      testID: 'mock-date-picker',
      onChange: (date?: Date) => onChange({}, date),
    });
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    // Close runs onClose then the post-close callback, as the real sheet does
    // after its exit animation.
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          onClose,
          testID,
        }: {
          children: React.ReactNode;
          onClose?: () => void;
          testID?: string;
        },
        ref: React.Ref<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onOpenBottomSheet: jest.fn(),
          onCloseBottomSheet: (callback?: () => void) => {
            onClose?.();
            callback?.();
          },
        }));
        return ReactActual.createElement(View, { testID }, children);
      },
    ),
  };
});

const DOB = new Date(1990, 0, 1);

describe('CardDateField', () => {
  const onChangeText = jest.fn();
  const originalOS = Platform.OS;

  afterAll(() => {
    Platform.OS = originalOS;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
  });

  it('renders the label and a placeholder when empty', () => {
    const { getByText, getByTestId } = render(
      <CardDateField
        label="Date of birth"
        value=""
        onChangeText={onChangeText}
        testID="dob"
      />,
    );

    expect(getByText('Date of birth')).toBeOnTheScreen();
    expect(getByTestId('dob')).toHaveProp(
      'accessibilityLabel',
      'Date of birth',
    );
  });

  it('renders the error text', () => {
    const { getByTestId } = render(
      <CardDateField
        label="Date of birth"
        value=""
        onChangeText={onChangeText}
        error="Too young"
        testID="dob"
        errorTestID="dob-error"
      />,
    );

    expect(getByTestId('dob-error')).toHaveTextContent('Too young');
  });

  it('commits the picked date on iOS when confirmed', () => {
    const { getByTestId } = render(
      <CardDateField
        label="Date of birth"
        value=""
        onChangeText={onChangeText}
        testID="dob"
      />,
    );

    fireEvent.press(getByTestId('dob'));
    fireEvent(getByTestId('mock-date-picker'), 'onChange', DOB);
    fireEvent.press(getByTestId('dob-confirm'));

    expect(onChangeText).toHaveBeenCalledWith(DOB.getTime().toString());
  });

  it('does not change the value when cancelled on iOS', () => {
    const { getByTestId, queryByTestId } = render(
      <CardDateField
        label="Date of birth"
        value=""
        onChangeText={onChangeText}
        testID="dob"
      />,
    );

    fireEvent.press(getByTestId('dob'));
    fireEvent.press(getByTestId('dob-cancel'));

    expect(onChangeText).not.toHaveBeenCalled();
    expect(queryByTestId('dob-sheet')).toBeNull();
  });

  it('shows the field label as the iOS sheet title and closes from the header', () => {
    const { getByTestId, getAllByText, queryByTestId } = render(
      <CardDateField
        label="Date of birth"
        value=""
        onChangeText={onChangeText}
        testID="dob"
      />,
    );

    fireEvent.press(getByTestId('dob'));

    expect(getByTestId('dob-sheet')).toBeOnTheScreen();
    expect(getAllByText('Date of birth').length).toBeGreaterThanOrEqual(2);

    fireEvent.press(getByTestId('dob-sheet-close'));

    expect(queryByTestId('dob-sheet')).toBeNull();
    expect(onChangeText).not.toHaveBeenCalled();
  });

  it('shows the error border state on the field', () => {
    const { getByTestId } = render(
      <CardDateField
        label="Date of birth"
        value=""
        onChangeText={onChangeText}
        error="Too young"
        testID="dob"
        errorTestID="dob-error"
      />,
    );

    expect(getByTestId('dob-error')).toHaveProp('accessibilityRole', 'alert');
  });

  it('commits immediately from the Android dialog', () => {
    Platform.OS = 'android';
    const { getByTestId } = render(
      <CardDateField
        label="Date of birth"
        value=""
        onChangeText={onChangeText}
        testID="dob"
      />,
    );

    fireEvent.press(getByTestId('dob'));
    fireEvent(getByTestId('mock-date-picker'), 'onChange', DOB);

    expect(onChangeText).toHaveBeenCalledWith(DOB.getTime().toString());
  });

  it('shows the stored date in the spoken label', () => {
    const { getByTestId } = render(
      <CardDateField
        label="Date of birth"
        value={DOB.getTime().toString()}
        onChangeText={onChangeText}
        testID="dob"
      />,
    );

    expect(getByTestId('dob').props.accessibilityLabel).toMatch(
      /^Date of birth, .*1990/,
    );
  });
});
