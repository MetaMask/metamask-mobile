import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import MoneyHeader from './MoneyHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import { MoneyMfaTestIds } from '../MoneyMfa/MoneyMfa.testIds';
import { strings } from '../../../../../../locales/i18n';
import { FLOATING_HEADER_FADE_TEST_ID } from '../../../../../component-library/components-temp/HeaderGlass';

jest.mock(
  '../../../../../component-library/components-temp/CapsuleGlass',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View testID="capsule">{children}</View>
      ),
    };
  },
);

const sharedValue = (value: number): SharedValue<number> =>
  ({ value }) as unknown as SharedValue<number>;

// The pushed screen drives the collapsing title from its ScrollView, so its
// header only renders with both scroll inputs.
const pushedProps = {
  scrollY: sharedValue(0),
  titleSectionHeight: sharedValue(0),
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
  });

  describe('glass', () => {
    it('stays in place with plain buttons by default', () => {
      const { queryByTestId } = render(<MoneyHeader onMenuPress={jest.fn()} />);

      expect(queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
      expect(queryByTestId('capsule')).toBeNull();
    });

    it('floats the tab header on its backdrop with the menu in a capsule', () => {
      const { getByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} isGlass />,
      );

      expect(getByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();
      expect(
        within(getByTestId('capsule')).getByTestId(
          MoneyHeaderTestIds.MENU_BUTTON,
        ),
      ).toBeOnTheScreen();
    });

    it('seats the back and menu buttons in capsules when pushed', () => {
      const onBack = jest.fn();
      const { getAllByTestId, getByTestId } = render(
        <MoneyHeader
          onMenuPress={jest.fn()}
          onBack={onBack}
          {...pushedProps}
          isGlass
        />,
      );

      expect(getAllByTestId('capsule')).toHaveLength(2);

      fireEvent.press(getByTestId(MoneyHeaderTestIds.BACK_BUTTON));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('reports the floating header layout so the page can inset its content', () => {
      const onLayout = jest.fn();
      const { getByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} isGlass onLayout={onLayout} />,
      );
      const event = { nativeEvent: { layout: { height: 103 } } };

      fireEvent(getByTestId(MoneyHeaderTestIds.CONTAINER), 'layout', event);

      expect(onLayout).toHaveBeenCalledWith(event);
    });
  });

  describe('2-step verification badge', () => {
    it('renders the badge when isMfaEnabled is true', () => {
      const { getByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} isMfaEnabled />,
      );

      expect(getByTestId(MoneyMfaTestIds.HEADER_BADGE)).toBeOnTheScreen();
    });

    it('omits the badge when isMfaEnabled is false', () => {
      const { queryByTestId } = render(
        <MoneyHeader onMenuPress={jest.fn()} isMfaEnabled={false} />,
      );

      expect(queryByTestId(MoneyMfaTestIds.HEADER_BADGE)).not.toBeOnTheScreen();
    });

    it('omits the badge when isMfaEnabled is not passed', () => {
      const { queryByTestId } = render(<MoneyHeader onMenuPress={jest.fn()} />);

      expect(queryByTestId(MoneyMfaTestIds.HEADER_BADGE)).not.toBeOnTheScreen();
    });

    it('renders the badge on the pushed header and opens the sheet', () => {
      const onMfaBadgePress = jest.fn();
      const { getByTestId } = render(
        <MoneyHeader
          {...pushedProps}
          onMenuPress={jest.fn()}
          onBack={jest.fn()}
          isMfaEnabled
          onMfaBadgePress={onMfaBadgePress}
        />,
      );

      fireEvent.press(getByTestId(MoneyMfaTestIds.HEADER_BADGE));

      expect(onMfaBadgePress).toHaveBeenCalledTimes(1);
    });
  });
});
