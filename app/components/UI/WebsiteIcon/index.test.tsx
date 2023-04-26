import React from 'react';
import { render } from '@testing-library/react-native';
import WebsiteIcon from './';

describe('WebsiteIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<WebsiteIcon title="title" url="url.com" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
