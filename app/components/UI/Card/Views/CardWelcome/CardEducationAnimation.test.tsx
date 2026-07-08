import React from 'react';
import { act, render } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CardEducationAnimation from './CardEducationAnimation';
import { CardEducationAnimationTestIds } from './CardEducationAnimation.testIds';
import {
  __getLastMockedMethods,
  __clearLastMockedMethods,
} from '../../../../../__mocks__/rive-react-native';

jest.mock('rive-react-native', () =>
  jest.requireActual('../../../../../__mocks__/rive-react-native'),
);

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockedUseSelector = useSelector as jest.Mock;

const FALLBACK_SOURCE = { uri: 'fallback' };

describe('CardEducationAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __clearLastMockedMethods();
  });

  it('renders the Rive animation when the flag is enabled', () => {
    mockedUseSelector.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <CardEducationAnimation fallbackSource={FALLBACK_SOURCE} />,
    );

    expect(getByTestId(CardEducationAnimationTestIds.RIVE)).toBeDefined();
    expect(
      queryByTestId(CardEducationAnimationTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('renders the static image when the flag is disabled', () => {
    mockedUseSelector.mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <CardEducationAnimation fallbackSource={FALLBACK_SOURCE} />,
    );

    const image = getByTestId(CardEducationAnimationTestIds.STATIC_IMAGE);
    expect(image).toBeDefined();
    expect(image.props.source).toBe(FALLBACK_SOURCE);
    expect(queryByTestId(CardEducationAnimationTestIds.RIVE)).toBeNull();
  });

  it('falls back to the static image when Rive errors', () => {
    mockedUseSelector.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <CardEducationAnimation fallbackSource={FALLBACK_SOURCE} />,
    );

    act(() => {
      const methods = __getLastMockedMethods() as
        | { onError?: (error: unknown) => void }
        | undefined;
      methods?.onError?.({ message: 'boom' });
    });

    expect(
      getByTestId(CardEducationAnimationTestIds.STATIC_IMAGE),
    ).toBeDefined();
    expect(queryByTestId(CardEducationAnimationTestIds.RIVE)).toBeNull();
  });

  it('honors a passed testID in the animated branch', () => {
    mockedUseSelector.mockReturnValue(true);

    const { getByTestId } = render(
      <CardEducationAnimation
        fallbackSource={FALLBACK_SOURCE}
        testID="custom-test-id"
      />,
    );

    expect(getByTestId('custom-test-id')).toBeDefined();
  });

  it('honors a passed testID in the fallback branch', () => {
    mockedUseSelector.mockReturnValue(false);

    const { getByTestId } = render(
      <CardEducationAnimation
        fallbackSource={FALLBACK_SOURCE}
        testID="custom-test-id"
      />,
    );

    expect(getByTestId('custom-test-id')).toBeDefined();
  });
});
