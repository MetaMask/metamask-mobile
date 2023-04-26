// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import Text from './Text';
import { TextVariant } from './Text.types';

describe('Text', () => {
  it('should render Text', () => {
    const { toJSON } = render(
      <Text variant={TextVariant.HeadingSMRegular}>{`I'm Text!`}</Text>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
