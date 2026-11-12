import type { PokedexEntry } from '../../services/clients/CollectiblesApiClient';

/** Replit: All is discoveries, while a generation includes its locked silhouettes. */
export function visiblePokedexEntries(
  entries: PokedexEntry[],
  generation: number | undefined,
  query: string,
) {
  const search = query.trim().toLocaleLowerCase();
  const dexNumber = search.replace(/^#0*/u, '');
  return entries
    .filter(
      (entry) =>
        (generation === undefined
          ? entry.unlocked
          : entry.generation === generation) &&
        (!search ||
          (entry.unlocked && entry.name.toLocaleLowerCase().includes(search)) ||
          String(entry.id) === dexNumber),
    )
    .sort(
      (left, right) => left.generation - right.generation || left.id - right.id,
    );
}
