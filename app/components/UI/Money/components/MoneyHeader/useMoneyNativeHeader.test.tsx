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

  it('passes the screen gate through', () => {
    expect(renderItems({ isEnabled: false }).isEnabled).toBe(false);
  });

  it('shows a plain inline title on the Money tab', () => {
    const { leftItems } = renderItems();

    expect(leftItems).toHaveLength(1);
    expect(leftItems[0]).toStrictEqual(
      expect.objectContaining({ type: 'custom', hidesSharedBackground: true }),
    );
    expect(
      renderCustom(leftItems[0]).getByTestId(MoneyHeaderTestIds.TITLE),
    ).toBeOnTheScreen();
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
  });

  it('shows only the menu when the Pro button is unavailable', () => {
    const { rightItems } = renderItems();
    const { getByTestId } = renderCustom(rightItems[0]);

    fireEvent.press(getByTestId(MoneyHeaderTestIds.MENU_BUTTON));

    expect(rightItems).toHaveLength(1);
    expect(baseParams.onMenuPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the Pro button as a solid pill before the menu', () => {
    const onPress = jest.fn();
    const { rightItems } = renderItems({
      proButton: { label: 'Upgrade', onPress },
    });
    const { getByTestId } = renderCustom(rightItems[0]);

    fireEvent.press(getByTestId(MoneyHeaderTestIds.GET_PRO_BUTTON));

    expect(rightItems).toHaveLength(2);
    expect(rightItems[0]).toStrictEqual(
      expect.objectContaining({ hidesSharedBackground: true }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
