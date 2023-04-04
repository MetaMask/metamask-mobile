export enum Sources {
  'web-desktop' = 'web-desktop',
  'web-mobile' = 'web-mobile',
  'nodejs' = 'nodejs',
  'unity' = 'unity',
  'non-browser' = 'non-browser',
  'react-native' = 'react-native',
  'in-app-browser' = 'in-app-browser',
  'ios' = 'ios',
  'android' = 'android',
}

export const parseSource = (source: string) => {
  if ((Object as any).values(Sources).includes(source.toLocaleLowerCase()))
    return source;
  return 'undefined';
};
