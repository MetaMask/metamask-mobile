import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../selectors/featureFlagController/glassHeaders';

/** Whether the `glassHeaders` flag is on, for headers without a flow flag. */
export const useIsGlassHeader = (): boolean =>
  // Strict check: many suites stub `useSelector` with non-boolean values.
  useSelector(selectGlassHeadersEnabled) === true;
