import { StyleSheet, View } from 'react-native';
import { fireEvent, render, renderHook } from '@testing-library/react-native';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import { useNativeHeader } from '../../../../hooks/useNativeHeader';
import { MoneyHeaderTestIds } from './MoneyHeader.testIds';
import {
  useMoneyNativeHeader,
  type MoneyNativeHeaderParams,
} from './useMoneyNativeHeader';

jest.mock('../../../../hooks/useNativeHeader', () => ({
  useNativeHeader: jest.fn(() => true),
}));

const baseParams: MoneyNativeHeaderParams = {
  onMenuPress: jest.fn(),
  isEnabled: true,
};

const renderItems = (overrides: Partial<MoneyNativeHeaderParams> = {}) => {
  renderHook(() => useMoneyNativeHeader({ ...baseParams, ...overrides }));
  const config = jest.mocked(useNativeHeader).mock.calls.at(-1)?.[0];
  return {
    isEnabled: config?.isEnabled,
    leftItems: config?.leftItems?.() ?? [],
    rightItems: config?.rightItems?.() ?? [],
  };
};

const renderCustom = (item: NativeStackHeaderItem | undefined) => {
  if (item?.type !== 'custom') {
    throw new Error('Expected a custom header item');
  }
  return render(item.element);
};

describe('useMoneyNativeHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes the screen gate through', () => {
    expect(renderItems({ isEnabled: false }).isEnabled).toBe(false);
  });

  it('hides the UIKit scroll edge effect, since the screen draws its own backdrop', () => {
    renderItems();

    expect(
      jest.mocked(useNativeHeader).mock.calls.at(-1)?.[0]
        ?.hidesScrollEdgeEffect,
    ).toBe(true);
  });

  it.each([
    [16, 0],
    [20, -4],
    [24, -8],
  ])(
    'positions the Money tab title 16pt from a %ipt UIKit inset',
    (nativeInset, expectedMargin) => {
      jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((cb) => {
        cb(nativeInset, 0, 0, 0);
      });

      const { leftItems } = renderItems();
      const renderedTitle = renderCustom(leftItems[0]);
      const title = renderedTitle.getByTestId(MoneyHeaderTestIds.TITLE);
      const titleContainer = renderedTitle.UNSAFE_getByType(View);
      fireEvent(titleContainer, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 0 } },
      });
      fireEvent(titleContainer, 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 0, height: 0 } },
      });

      expect(leftItems).toHaveLength(1);
      expect(leftItems[0]).toStrictEqual(
        expect.objectContaining({
          type: 'custom',
          hidesSharedBackground: true,
        }),
      );
      expect(title).toBeOnTheScreen();
      expect(StyleSheet.flatten(title.props.style).marginLeft).toBe(
        expectedMargin,
      );
    },
  );

  it('shows a plain inline title on the Money tab', () => {
    const { leftItems } = renderItems();

    expect(leftItems).toHaveLength(1);
    expect(leftItems[0]).toStrictEqual(
      expect.objectContaining({ type: 'custom', hidesSharedBackground: true }),
    );
    const title = renderCustom(leftItems[0]).getByTestId(
      MoneyHeaderTestIds.TITLE,
    );
    expect(title).toBeOnTheScreen();
  });

  it('adds a separate back button when pushed over another flow', () => {
    const onBack = jest.fn();
    const [backItem] = renderItems({ onBack }).leftItems;
    if (backItem?.type !== 'button') {
      throw new Error('Expected a back button item');
    }

    backItem.onPress();

    expect(backItem.sharesBackground).toBe(false);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(
      StyleSheet.flatten(
        renderCustom(renderItems({ onBack }).leftItems[1]).getByTestId(
          MoneyHeaderTestIds.TITLE,
        ).props.style,
      ).marginLeft,
    ).toBeUndefined();
  });

  it('shows only the menu when the Pro button is unavailable', () => {
    const { rightItems } = renderItems();
    const { getByTestId } = renderCustom(rightItems[0]);

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(rightItems).toHaveLength(1);
    expect(baseParams.onMenuPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the menu button transparent while pressed', () => {
    const { rightItems } = renderItems();
    const { getByTestId } = renderCustom(rightItems[0]);

    fireEvent(getByTestId(MoneyHeaderTestIds.MENU_BUTTON), 'pressIn');

    expect(
      StyleSheet.flatten(
        getByTestId(MoneyHeaderTestIds.MENU_BUTTON).props.style,
      ).backgroundColor,
    ).toBe('transparent');
  });
});
