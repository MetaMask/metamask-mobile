import { useParams } from '../../../../util/navigation/navUtils';

export function useMaxValueMode() {
  const params = useParams<{
    params: { maxValueMode: boolean };
  }>();

  const maxValueMode = params?.params?.maxValueMode;

  return { maxValueMode };
}
