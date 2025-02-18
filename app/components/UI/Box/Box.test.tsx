import React from 'react';
import { render } from '@testing-library/react-native';
import { Box } from './Box';
import Text, {
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import {
  Display,
  JustifyContent,
  FlexDirection,
  TextAlign,
  AlignItems,
} from '../../UI/Box/box.types';

describe('Box', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Box>
        <Text>Test Content</Text>
      </Box>,
    );
    expect(getByText('Test Content')).toBeTruthy();
  });

  it('applies display style correctly', () => {
    const { getByTestId } = render(
      <Box testID="test-box" display={Display.Block}>
        <Text>Test Content</Text>
      </Box>,
    );
    expect(getByTestId('test-box').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          display: 'block',
        }),
      ]),
    );
  });

  it('applies flex direction style correctly', () => {
    const { getByTestId } = render(
      <Box testID="test-box" flexDirection={FlexDirection.Row}>
        <Text>Test Content</Text>
      </Box>,
    );
    const styles = getByTestId('test-box').props.style;
    expect(styles).toEqual([{ flexDirection: 'row' }, undefined]);
  });

  it('applies justify content style correctly', () => {
    const { getByTestId } = render(
      <Box testID="test-box" justifyContent={JustifyContent.center}>
        <Text>Test Content</Text>
      </Box>,
    );
    expect(getByTestId('test-box').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          justifyContent: 'center',
        }),
      ]),
    );
  });

  it('applies align items style correctly', () => {
    const { getByTestId } = render(
      <Box testID="test-box" alignItems={AlignItems.center}>
        <Text>Test Content</Text>
      </Box>,
    );
    expect(getByTestId('test-box').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          alignItems: 'center',
        }),
      ]),
    );
  });

  it('applies text align style correctly', () => {
    const { getByTestId } = render(
      <Box testID="test-box" textAlign={TextAlign.center}>
        <Text>Test Content</Text>
      </Box>,
    );
    expect(getByTestId('test-box').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          textAlign: 'center',
        }),
      ]),
    );
  });

  it('applies gap style correctly', () => {
    const { getByTestId } = render(
      <Box testID="test-box" gap={8}>
        <Text>Test Content</Text>
      </Box>,
    );
    expect(getByTestId('test-box').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          gap: 8,
        }),
      ]),
    );
  });

  it('applies color style correctly', () => {
    const { getByTestId } = render(
      <Box testID="test-box" color={TextColor.Default}>
        <Text>Test Content</Text>
      </Box>,
    );
    expect(getByTestId('test-box').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          color: 'Default',
        }),
      ]),
    );
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<View>();
    render(
      <Box ref={ref}>
        <Text>Test Content</Text>
      </Box>,
    );
    expect(ref.current).toBeTruthy();
  });
});
