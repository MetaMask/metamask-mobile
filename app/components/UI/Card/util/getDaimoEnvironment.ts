export type DaimoEnvironment = 'demo' | 'production';

export const getDaimoEnvironment = (isDaimoDemo: boolean): DaimoEnvironment => {
  if (isDaimoDemo) {
    return 'demo';
  }
  return 'production';
};
