import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialFeedPostSkeleton from './SocialFeedPostSkeleton';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';

const flatStyle = (style: unknown): ViewStyle =>
  (StyleSheet.flatten(style) ?? {}) as ViewStyle;

interface RenderedNode {
  props?: { style?: unknown };
  children?: (RenderedNode | string)[] | null;
}

const hasAvatarBone = (
  node: RenderedNode | string | null | undefined,
): boolean => {
  if (!node || typeof node === 'string') {
    return false;
  }
  const style = flatStyle(node.props?.style);
  if (style.width === 40 && style.height === 40) {
    return true;
  }
  return node.children?.some(hasAvatarBone) ?? false;
};

describe('SocialFeedPostSkeleton', () => {
  it('renders with a stable test id per index', () => {
    renderWithProvider(<SocialFeedPostSkeleton index={2} />);

    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(2)),
    ).toBeOnTheScreen();
  });

  it('matches the loaded post gutter so the card is not full width', () => {
    renderWithProvider(<SocialFeedPostSkeleton index={0} />);

    const root = screen.getByTestId(getSocialFeedPostSkeletonTestId(0));
    expect(flatStyle(root.props.style)).toEqual(
      expect.objectContaining({ paddingTop: 8, paddingBottom: 8 }),
    );

    const tree = screen.toJSON() as RenderedNode;
    const rows: RenderedNode[] = [];
    const visit = (node: RenderedNode | string | null | undefined) => {
      if (!node || typeof node === 'string') {
        return;
      }
      const style = flatStyle(node.props?.style);
      if (style.flexDirection === 'row' && style.gap === 12) {
        rows.push(node);
      }
      node.children?.forEach(visit);
    };
    visit(tree);

    expect(rows.some(hasAvatarBone)).toBe(true);
  });
});
