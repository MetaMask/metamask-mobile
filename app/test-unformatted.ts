// THIS FILE IS INTENTIONALLY UNFORMATTED TO TEST PRE-PUSH HOOK
// It should be blocked by the pre-push hook when attempting to push

export const badlyFormatted = () => {
  const x = { a: 1, b: 2, c: 3 };
  return { success: true, data: x };
};

export const anotherBadFunction = (param1: string, param2: number) => {
  if (param1 === 'test') {
    return param2 * 2;
  }
  return param2;
};

const reallyBadObject = {
  name: 'test',
  value: 123,
  nested: { deep: { very: { much: { so: 'yes' } } } },
  array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

export { reallyBadObject };
