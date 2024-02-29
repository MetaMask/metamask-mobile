import { preventEnzymeImportSyntax } from './enzyme-import-syntax';

const RULES: IRule[] = [
  {
    name: "Don't introduce more enzyme imports",
    fn: preventEnzymeImportSyntax,
    docURL:
      '[WIP] No document exists for standardized unit tests yet.',
  },
];

interface IRule {
  name: string;
  fn: (diff: string) => boolean;
  docURL?: string;
}

function runFitnessFunctionRule(rule: IRule, diff: string): void {
  const { name, fn, docURL } = rule;
  console.log(`Checking rule "${name}"...`);

  const hasRulePassed: boolean = fn(diff) as boolean;
  if (hasRulePassed === true) {
    console.log(`...OK`);
  } else {
    console.log(`...FAILED. Changes not accepted by the fitness function.`);

    if (docURL) {
      console.log(`For more info: ${docURL}.`);
    }

    process.exit(1);
  }
}

export { RULES, runFitnessFunctionRule };
export type { IRule };