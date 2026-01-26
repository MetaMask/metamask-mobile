/**
 * Load Skill Tool Handler
 *
 * Allows the agent to dynamically load domain expertise skills during analysis.
 * This enables on-demand skill loading rather than pre-loading all skills upfront.
 */

import { loadSkillByName } from '../../utils/skill-loader';

/**
 * Load a skill by name and return its content
 *
 * @param skillName - Name of the skill to load
 * @returns Skill content or error message
 */
export async function handleLoadSkill(skillName: string): Promise<string> {
  console.log(`🔧 Tool: load_skill (${skillName})`);

  const skill = await loadSkillByName(skillName);

  if (!skill) {
    return `Error: Skill '${skillName}' not found or could not be loaded.

Available skills can be found in the system prompt under "AVAILABLE SKILLS".`;
  }

  // Return full skill content
  return `# SKILL: ${skill.name}

${skill.content}

---

Skill loaded successfully. You can now use this expertise to assist with your analysis.`;
}
