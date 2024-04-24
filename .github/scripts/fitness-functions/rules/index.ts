import { preventCodeBlocksRule } from './prevent-code-blocks';

const RULES: IRule[] = [
  {
    name: 'Check for blacklisted code blocks',
    fn: preventCodeBlocksRule,
    docURL: '[WIP] No documentation exists for this rule yet.',
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
