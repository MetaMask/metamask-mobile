export type DaimoEnvironment = 'demo' | 'production';

export const getDaimoEnvironment = (): DaimoEnvironment => {
  if (__DEV__) {
    return 'demo';
  }
  return 'production';
};

export const isDaimoProduction = (): boolean =>
  getDaimoEnvironment() === 'production';

export const isDaimoDemo = (): boolean => getDaimoEnvironment() === 'demo';
