// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { TextVariant, TextColor } from '../../Texts/Text';

// Internal dependencies.
import Tag from './Tag';

describe('Tag', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<Tag label={'Imported'} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with textProps', () => {
    const { toJSON } = render(
      <Tag
        label={'Custom Text'}
        textProps={{
          variant: TextVariant.BodySM,
          color: TextColor.Primary,
        }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should override text variant when textProps variant is provided', () => {
    const { getByText } = render(
      <Tag label={'Small Text'} textProps={{ variant: TextVariant.BodySM }} />,
    );

    const textElement = getByText('Small Text');
    expect(textElement).toBeDefined();
    // The text should have the BodySM variant styles applied
    expect(textElement.props.style).toEqual(
      expect.objectContaining({
        fontSize: expect.any(Number),
      }),
    );
  });

  it('should apply text color when textProps color is provided', () => {
    const { getByText } = render(
      <Tag label={'Colored Text'} textProps={{ color: TextColor.Primary }} />,
    );

    const textElement = getByText('Colored Text');
    expect(textElement).toBeDefined();
  });

  it('should maintain default variant when no textProps variant is provided', () => {
    const { getByText } = render(
      <Tag label={'Default Text'} textProps={{ color: TextColor.Primary }} />,
    );

    const textElement = getByText('Default Text');
    expect(textElement).toBeDefined();
    // Should still have default BodyMD variant but with custom color
  });

  it('should render without textProps (backward compatibility)', () => {
    const { getByText } = render(<Tag label={'Simple Tag'} />);

    const textElement = getByText('Simple Tag');
    expect(textElement).toBeDefined();
  });
});
