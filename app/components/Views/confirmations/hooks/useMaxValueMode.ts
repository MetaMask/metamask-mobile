import { useSelector } from 'react-redux';

import { selectTransactionState } from '../../../../reducers/transaction';
import { useParams } from '../../../../util/navigation/navUtils';

export function useMaxValueMode() {
  const { maxValueMode: stateMaxValueMode } =
    useSelector(selectTransactionState) || {};
  const params = useParams<{
    params: { maxValueMode: boolean };
  }>();

  const paramsMaxValueMode = params?.params?.maxValueMode;
  const maxValueMode = stateMaxValueMode || paramsMaxValueMode;

  return { maxValueMode };
}
