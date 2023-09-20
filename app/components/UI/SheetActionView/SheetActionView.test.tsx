import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SheetActionView from './SheetActionVIew';

describe('SheetActionView', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <SheetActionView onCancel={() => null} onConfirm={() => null} />,
      { state: {} },
    );
    expect(toJSON).toMatchSnapshot();
  });
});
