import React from 'react';
import MaxBrowserTabsModal from '.';
import { render } from '@testing-library/react-native';
import { ThemeContext, mockTheme } from '../../../util/theme';

describe('MaxBrowserTabsModal', () => {

  it('should match snapshot when MaxBrowserTabsModal', () => {
    const { toJSON } = render(
      <MaxBrowserTabsModal />
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
