import { getTabBarFloatingBottomPadding } from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.utils';
import {
  TAB_BAR_FLOATING_GAP,
  TAB_BAR_FLOATING_HEIGHT,
  TAB_BAR_FLOATING_HORIZONTAL_INSET,
} from '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloating.constants';
import {
  getNativeSocialTabBadgePosition,
  NATIVE_TAB_ICON_SIZE,
} from './NativeSocialTabBadge';

describe('getNativeSocialTabBadgePosition', () => {
  it('places the badge over the final app tab before the detached search slot', () => {
    const input = {
      width: 390,
      height: 844,
      bottomInset: 34,
      tabIndex: 3,
      tabCount: 4,
    };
    const tabBarWidth =
      input.width -
      TAB_BAR_FLOATING_HORIZONTAL_INSET * 2 -
      TAB_BAR_FLOATING_GAP -
      TAB_BAR_FLOATING_HEIGHT;
    const tabWidth = tabBarWidth / input.tabCount;

    const result = getNativeSocialTabBadgePosition(input);

    expect(result).toEqual({
      left:
        TAB_BAR_FLOATING_HORIZONTAL_INSET +
        tabWidth * (input.tabIndex + 0.5) -
        NATIVE_TAB_ICON_SIZE / 2,
      top:
        input.height -
        getTabBarFloatingBottomPadding(input.bottomInset) -
        TAB_BAR_FLOATING_HEIGHT +
        6,
    });
  });
});
