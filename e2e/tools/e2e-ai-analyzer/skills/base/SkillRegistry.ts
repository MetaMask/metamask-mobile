/** Central registry for skill discovery and retrieval */

import { Skill } from './Skill';
import { SkillMetadata } from '../../types';

export class SkillRegistry {
  private static skills = new Map<string, Skill>();

  /** Registers a skill (overwrites if already exists) */
  static register(skill: Skill): void {
    if (this.skills.has(skill.name)) {
      console.warn(
        `⚠️  Skill '${skill.name}' is already registered. Overwriting.`,
      );
    }
    this.skills.set(skill.name, skill);
    console.log(`✅ Registered skill: ${skill.name} (v${skill.version})`);
  }

  /**
   * Gets a skill by name (throws if not found)
   * @template SkillType - Optional specific skill type
   */
  static get<SkillType extends Skill>(name: string): SkillType {
    const skill = this.skills.get(name);
    if (!skill) {
      const available = Array.from(this.skills.keys()).join(', ');
      throw new Error(
        `Skill '${name}' not found in registry. Available skills: ${available || 'none'}`,
      );
    }
    return skill as SkillType;
  }

  /** Checks if a skill is registered */
  static has(name: string): boolean {
    return this.skills.has(name);
  }

  /** Lists all registered skill metadata */
  static list(): SkillMetadata[] {
    return Array.from(this.skills.values()).map((skill) => skill.getMetadata());
  }

  /** Removes a skill from the registry */
  static remove(name: string): void {
    this.skills.delete(name);
  }

  /** Clears all skills (for testing) */
  static clear(): void {
    this.skills.clear();
  }

  /** Returns the number of registered skills */
  static size(): number {
    return this.skills.size;
  }
}
