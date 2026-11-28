import { useQuery } from '@tanstack/react-query';
import { collectiblesPackDetailOptions } from '../queries/packDetail';

export function usePackDetail(code: string) {
  return useQuery(collectiblesPackDetailOptions(code));
}
