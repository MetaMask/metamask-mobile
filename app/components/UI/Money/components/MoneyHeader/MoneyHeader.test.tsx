import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import MoneyHeader from './MoneyHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import { strings } from '../../../../../../locales/i18n';

const sharedValue = (value: number): SharedValue<number> =>
  ({ value }) as unknown as SharedValue<number>;

// The pushed screen drives the collapsing title from its ScrollView, so its
// header only renders with both scroll inputs.
const pushedProps = {
  scrollY: sharedValue(0),
  titleSectionHeight: sharedValue(0),
};

const proButton = {
  label: strings('pro_subscription.join_pro'),
  onPress: jest.fn(),
};

describe('MoneyHeader', () => {
  it('renders the menu button', () => {
    const { getByTestId } = render(<MoneyHeader onMenuPress={jest.fn()} />);

    expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
  });

  it('renders the Money title alongside the menu button', () => {
    const { getByTestId } = render(<MoneyHeader onMenuPress={jest.fn()} />);

    expect(getByTestId(MoneyHeaderTestIds.TITLE)).toHaveTextContent(
      strings('money.title'),
    );

    expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
  });

  it('calls onMenuPress when the menu button is pressed', () => {
    const mockOnMenuPress = jest.fn();
    const { getByTestId } = render(
      <MoneyHeader onMenuPress={mockOnMenuPress} />,
    );

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(mockOnMenuPress).toHaveBeenCalledTimes(1);
  });

  it('uses the same horizontal padding as the Home page header', () => {
    const { getByTestId } = render(<MoneyHeader onMenuPress={jest.fn()} />);

    expect(getByTestId(MoneyHeaderTestIds.CONTAINER)).toHaveStyle({
      paddingLeft: 16,
      paddingRight: 12,
    });
  });

  describe('back button', () => {
    it('is not rendered without an onBack handler', () => {
      const { queryByTestId } = render(<MoneyHeader onMenuPress={jest.fn()} />);

      expect(
        queryByTestId(MoneyHeaderTestIds.BACK_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('is rendered with an onBack handler', () => {
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          onBack={jest.fn()}
          {...pushedProps}
        />,
      );

      expect(getByTestId(MoneyHeaderTestIds.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('calls onBack when pressed', () => {
      const mockOnBack = jest.fn();
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          onBack={mockOnBack}
          {...pushedProps}
        />,
      );

      fireEvent.press(getByTestId(MoneyHeaderTestIds.BACK_BUTTON));

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('keeps the Money title and the menu button alongside it', () => {
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          onBack={jest.fn()}
          {...pushedProps}
        />,
      );

      expect(getByTestId(MoneyHeaderTestIds.TITLE)).toHaveTextContent(
        strings('money.title'),
      );
      expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
    });

    it('keeps the Pro button alongside the back button', () => {
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          proButton={proButton}
          onBack={jest.fn()}
          {...pushedProps}
        />,
      );

      expect(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON)).toBeOnTheScreen();
      expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
    });
  });

  describe('Pro button', () => {
    it('is not rendered without a proButton, leaving the menu in place', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} />,
      );

      expect(
        queryByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON),
      ).not.toBeOnTheScreen();
      expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
    });

    it('renders the caller-provided label alongside the menu', () => {
      const { getByTestId, getByLabelText } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          proButton={{ label: 'Pro', onPress: jest.fn() }}
        />,
      );

      expect(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON)).toHaveTextContent(
        'Pro',
      );
      expect(getByLabelText('Pro')).toBeOnTheScreen();
      expect(getByTestId(MoneyHeaderTestIds.MENU_BUTTON)).toBeOnTheScreen();
    });

    it('calls the provided onPress when pressed', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          proButton={{ label: 'Pro', onPress: mockOnPress }}
        />,
      );

      fireEvent.press(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });
});
