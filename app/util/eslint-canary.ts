// Throwaway file to confirm ESLint catches a new rules-of-hooks violation. Delete after checking.
import { useState } from 'react';

export function addNumbers(a: number, b: number) {
  const [value] = useState(a);
  return value + b;
}
