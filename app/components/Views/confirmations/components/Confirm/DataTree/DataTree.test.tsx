import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import DataTree from './DataTree';

describe('NoChangeSimulation', () => {
  it('should match snapshot', async () => {
    const { getByText } = renderWithProvider(
      <DataTree
        data={{
          Message: { type: 'string', value: 'Hi, Alice!' },
          'A number': { type: 'uint32', value: '1337' },
        }}
        chainId="0x1"
      />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Hi, Alice!')).toBeDefined();
    expect(getByText('A number')).toBeDefined();
    expect(getByText('1337')).toBeDefined();
  });
});
