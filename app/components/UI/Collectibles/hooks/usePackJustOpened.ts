import { useQuery } from '@tanstack/react-query';
import { collectiblesPackJustOpenedOptions } from '../queries/packDetail';

export function usePackJustOpened(code: string) {
  return useQuery(collectiblesPackJustOpenedOptions(code));
}
