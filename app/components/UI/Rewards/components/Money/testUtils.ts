import { within } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { AvatarIcon, IconName } from '@metamask/design-system-react-native';

/**
 * Reads the icon a Rewards Money row or card draws, so a test can assert it
 * with `expect(avatarIconNameIn(getByTestId(id))).toBe(IconName.People)`.
 * The only `AvatarIcon` the row renders is the one whose name is returned.
 *
 * @param node - The row or card, from `getByTestId`.
 * @returns The icon name passed to the single `AvatarIcon` inside `node`.
 */
export function avatarIconNameIn(node: ReactTestInstance): IconName {
  return within(node).UNSAFE_getByType(AvatarIcon).props.iconName;
}
