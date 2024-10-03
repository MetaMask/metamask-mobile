import React from 'react';
import renderWithProvider, { DeepPartial } from '../../util/test/renderWithProvider';
import SnapsExecutionWebViewWrapper from './SnapsExecutionWebViewWrapper';
import { SnapsExecutionWebView } from './SnapsExecutionWebView';
import { RootState } from '../../reducers';

jest.mock('./SnapsExecutionWebView', () => ({
  SnapsExecutionWebView: jest.fn(() => null),
}));

const mockInitialState: DeepPartial<RootState> = {
  settings: {
    basicFunctionalityEnabled: true,
  },
};

describe('SnapsExecutionWebViewWrapper', () => {

  it('should render correctly webview', () => {
    const { toJSON } = renderWithProvider(
      <SnapsExecutionWebViewWrapper />,
    );
    expect(toJSON).toMatchSnapshot();
  });

  it('renders SnapsExecutionWebView when basicFunctionalityEnabled is true', () => {
    renderWithProvider(
        <SnapsExecutionWebViewWrapper />,
        { state: mockInitialState },
    );

    expect(SnapsExecutionWebView).toHaveBeenCalled();
  });

  it('renders SnapsExecutionWebView with correct props when basicFunctionalityEnabled is false', () => {
    renderWithProvider(
      <SnapsExecutionWebViewWrapper />,
      { state: {
        settings: {
          basicFunctionalityEnabled: false,
        },
      },
    },
    );

    expect(SnapsExecutionWebView).toHaveBeenCalledWith(
      expect.objectContaining({
        onWebViewReady: expect.any(Function),
      }),
      {}
    );
  });
});
