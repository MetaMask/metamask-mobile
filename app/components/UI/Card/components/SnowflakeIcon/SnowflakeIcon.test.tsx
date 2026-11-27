import React from 'react';
import { render } from '@testing-library/react-native';
import SnowflakeIcon, { SNOWFLAKE_ICON_TEST_ID } from './SnowflakeIcon';

describe('SnowflakeIcon', () => {
  it('renders the temporary snowflake asset', () => {
    const { getByTestId } = render(<SnowflakeIcon />);

    expect(getByTestId(SNOWFLAKE_ICON_TEST_ID)).toBeOnTheScreen();
  });
});
