jest.useFakeTimers();

import React from 'react';
import { shallow } from 'enzyme';
import { render, screen } from '@testing-library/react-native';
import { BrowserTab } from './';

describe('Browser', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<BrowserTab initialUrl="https://metamask.io" />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should pop up an alert box', async () => {
    render(<BrowserTab initialUrl="https://metamask.io" />);

    const browserTitle = await screen.findByTestId('title');

    expect(browserTitle).toBeTruthy();
  });
});
