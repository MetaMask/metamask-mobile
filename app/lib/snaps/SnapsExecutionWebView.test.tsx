import { SnapsExecutionWebView } from './SnapsExecutionWebView';

import renderWithProvider from '../../util/test/renderWithProvider';

describe('testSnapsWebViewInitialization', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<SnapsExecutionWebView />);
    expect(toJSON()).toMatchSnapshot();
  });
});
