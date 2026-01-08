import React from 'react';
import { render } from '@testing-library/react-native';
import { View, FlexAlignType } from 'react-native';

import Skeleton from './Skeleton';

// Mock animation timers
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useFakeTimers({ legacyFakeTimers: true });
  jest.clearAllMocks();
});

const customStyles = {
  alignStart: {
    alignSelf: 'flex-start' as FlexAlignType,
  },
};

describe('Skeleton', () => {
  it('should render Skeleton without error', () => {
    const { getByTestId } = render(<Skeleton testID="skeleton" />);
    expect(getByTestId('skeleton')).toBeDefined();
  });

  it('should match snapshot', () => {
    const { toJSON } = render(<Skeleton />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render with custom alignSelf style', () => {
    const { getByTestId } = render(
      <Skeleton testID="skeleton" style={customStyles.alignStart} />,
    );
    const skeletonElement = getByTestId('skeleton');
    expect(skeletonElement.props.style.alignSelf).toBe('flex-start');
  });

  it('should render with explicit height and width', () => {
    const { getByTestId } = render(
      <Skeleton testID="skeleton" height={100} width={200} />,
    );
    const skeletonElement = getByTestId('skeleton');
    expect(skeletonElement.props.style.height).toBe(100);
    expect(skeletonElement.props.style.width).toBe(200);
  });

  it('should render with string dimensions', () => {
    const { getByTestId } = render(
      <Skeleton testID="skeleton" height="50%" width="100%" />,
    );
    const skeletonElement = getByTestId('skeleton');
    expect(skeletonElement.props.style.height).toBe('50%');
    expect(skeletonElement.props.style.width).toBe('100%');
  });

  it('should hide children when hideChildren is true', () => {
    const childTestId = 'child-component';
    const childrenWrapperId = 'children-wrapper';

    const { getByTestId } = render(
      <Skeleton
        hideChildren
        childrenWrapperProps={{ testID: childrenWrapperId }}
      >
        <View testID={childTestId} />
      </Skeleton>,
    );

    const childrenWrapper = getByTestId(childrenWrapperId);
    expect(childrenWrapper.props.style[1]).toEqual({ opacity: 0 });
  });

  it('should display children normally when hideChildren is false', () => {
    const childTestId = 'child-component';

    const { getByTestId } = render(
      <Skeleton>
        <View testID={childTestId} />
      </Skeleton>,
    );

    expect(getByTestId(childTestId)).toBeDefined();
  });

  it('should animate when no children are present', () => {
    const animatedBackgroundId = 'animated-background';

    const { getByTestId } = render(
      <Skeleton
        testID="skeleton"
        animatedViewProps={{ testID: animatedBackgroundId }}
      />,
    );

    const skeletonElement = getByTestId('skeleton');
    const animatedBackground = getByTestId(animatedBackgroundId);
    expect(skeletonElement).toBeDefined();
    expect(animatedBackground).toBeDefined();
    expect(animatedBackground.props.style).toEqual(
      expect.objectContaining({
        position: 'absolute',
        backgroundColor: expect.any(String),
        borderRadius: 4,
      }),
    );
  });

  it('should animate when children are hidden', () => {
    const childTestId = 'child-component';
    const childrenWrapperId = 'children-wrapper';
    const animatedBackgroundId = 'animated-background';

    const { getByTestId } = render(
      <Skeleton
        testID="skeleton"
        hideChildren
        childrenWrapperProps={{ testID: childrenWrapperId }}
        animatedViewProps={{ testID: animatedBackgroundId }}
      >
        <View testID={childTestId} />
      </Skeleton>,
    );

    const animatedBackground = getByTestId(animatedBackgroundId);
    const childElement = getByTestId(childTestId);
    const childrenWrapper = getByTestId(childrenWrapperId);
    expect(animatedBackground).toBeDefined();
    expect(childElement).toBeDefined();
    expect(childrenWrapper.props.style[1]).toEqual({ opacity: 0 });
  });
});
