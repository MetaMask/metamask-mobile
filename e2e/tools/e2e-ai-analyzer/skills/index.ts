/**
 * Skills Registry and Loader
 *
 * Central place to register and discover all available skills.
 */

import { SkillRegistry } from './base/SkillRegistry';
import { SelectTagsSkill } from './select-tags/SelectTagsSkill';

/**
 * Register all available skills
 * This should be called at application startup
 */
export function registerAllSkills(): void {
  // Core skill: select-tags
  SkillRegistry.register(new SelectTagsSkill());

  // Future skills can be added here
  // SkillRegistry.register(new GapDetectorSkill());
  // SkillRegistry.register(new BalanceTestPyramidSkill());
}

// Re-export for convenience
export { SkillRegistry } from './base/SkillRegistry';
export { Skill } from './base/Skill';
export { SkillExecutor } from './base/SkillExecutor';
