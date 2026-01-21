/**
 * Registry for managing available skills
 *
 * Provides a central registry for skill discovery and retrieval.
 * Skills must be registered before they can be used.
 */

import { Skill } from './Skill';
import { SkillMetadata } from '../../types';

export class SkillRegistry {
  private static skills = new Map<string, Skill>();

  /**
   * Register a skill in the registry
   * If a skill with the same name already exists, it will be overwritten with a warning
   */
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
   * Get a skill by name
   * Throws an error if the skill is not found
   */
  static get<T extends Skill>(name: string): T {
    const skill = this.skills.get(name);
    if (!skill) {
      const available = Array.from(this.skills.keys()).join(', ');
      throw new Error(
        `Skill '${name}' not found in registry. Available skills: ${available || 'none'}`,
      );
    }
    return skill as T;
  }

  /**
   * Check if a skill is registered
   */
  static has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * List all registered skills
   * Returns metadata for discovery
   */
  static list(): SkillMetadata[] {
    return Array.from(this.skills.values()).map((skill) => skill.getMetadata());
  }

  /**
   * Remove a skill from the registry
   */
  static remove(name: string): void {
    this.skills.delete(name);
  }

  /**
   * Clear all skills from the registry
   * Useful for testing
   */
  static clear(): void {
    this.skills.clear();
  }

  /**
   * Get the number of registered skills
   */
  static size(): number {
    return this.skills.size;
  }
}
