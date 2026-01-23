/**
 * Skill Loader - Load and manage AI skills from markdown files
 */

import { readFile } from 'fs/promises';
import { readdirSync } from 'fs';
import { join } from 'path';
import { Skill, SkillMetadata } from '../types';

interface SkillQuality {
  warnings: string[];
  score: number; // 0-100
}

/**
 *
 * Load from skills/ directory
 *
 * @param name - Skill name (without .md extension)
 * @returns Loaded skill or null if not found
 */
async function loadSingleSkill(name: string): Promise<Skill | null> {
  const skillPath = join(__dirname, '..', 'skills', `${name}.md`);

  try {
    const rawContent = await readFile(skillPath, 'utf-8');
    const { metadata, content } = parseSkillFile(rawContent, name);

    const skill = { name, metadata, content };

    // Validate structure (non-blocking - warns but doesn't fail)
    const quality = assessSkillQuality(skill);
    if (quality.warnings.length > 0) {
      console.warn(`   Skill '${name}' quality: ${quality.score}/100`);
      quality.warnings.forEach((w) => console.warn(`     ${w}`));
    }

    return skill;
  } catch (error) {
    // Distinguish between file not found vs malformed
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ENOENT') {
        console.warn(`⚠️  Skill not found: ${name}`);
        console.warn(`   Expected location: skills/${name}.md`);
      } else {
        console.warn(`⚠️  Skill '${name}' is malformatted and will be skipped`);
        console.warn(`   Error: ${error.message}`);
        console.warn(`   Continuing without this skill...`);
      }
    } else {
      console.warn(`⚠️  Failed to load skill: ${name}`);
    }
    return null;
  }
}

/**
 * Parse skill markdown file into metadata and content
 *
 * Expected format:
 * ---
 * name: skill-name
 * description: Description
 * tools: tool1 tool2
 * ---
 * Content...
 *
 * @param markdown - Raw markdown content
 * @param skillName - Skill name for error messages
 * @returns Parsed metadata and content
 */
function parseSkillFile(
  markdown: string,
  skillName: string,
): { metadata: SkillMetadata; content: string } {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    throw new Error(
      `Skill '${skillName}' has invalid format. Missing frontmatter.

Expected format:
---
name: ${skillName}
description: Brief description
---
Content here...`,
    );
  }

  const [, frontmatterYaml, content] = frontmatterMatch;
  const metadata = parseFrontmatter(frontmatterYaml);

  // Validate required fields
  if (!metadata.name) {
    throw new Error(
      `Skill '${skillName}' is missing required field: 'name' in frontmatter`,
    );
  }

  if (!metadata.description) {
    throw new Error(
      `Skill '${skillName}' is missing required field: 'description' in frontmatter`,
    );
  }

  return { metadata, content };
}

/**
 * Parse YAML frontmatter into metadata object
 *
 * Simple YAML parser for our limited use case
 *
 * @param yaml - YAML string
 * @returns Parsed metadata
 */
function parseFrontmatter(yaml: string): SkillMetadata {
  const lines = yaml.split('\n');
  const parsed: Record<string, string | string[]> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (value.startsWith('[')) {
      // Array: [item1, item2]
      parsed[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);
    } else {
      parsed[key] = value;
    }
  }

  // Construct proper SkillMetadata object
  const metadata: SkillMetadata = {
    name: typeof parsed.name === 'string' ? parsed.name : '',
    description:
      typeof parsed.description === 'string' ? parsed.description : '',
  };

  if (typeof parsed.tools === 'string') {
    metadata.tools = parsed.tools;
  }

  return metadata;
}

/**
 * Assess skill quality (non-blocking validation)
 *
 * Checks for recommended sections and provides feedback
 *
 * @param skill - Skill to assess
 * @returns Quality warnings and score
 */
function assessSkillQuality(skill: Skill): SkillQuality {
  const warnings: string[] = [];
  let score = 100;

  // Check for recommended sections
  const sections = {
    'When to Activate': /##\s+When to (Activate|Use)/i,
    'Domain Knowledge': /##\s+(Domain Knowledge|Knowledge|Context)/i,
    Examples: /##\s+Examples?/i,
    'Risk Factors': /##\s+Risk/i,
    Guidelines: /##\s+(Guidelines|Testing|Instructions)/i,
  };

  for (const [section, pattern] of Object.entries(sections)) {
    if (!pattern.test(skill.content)) {
      warnings.push(`Missing '## ${section}' section (recommended)`);
      score -= 15;
    }
  }

  // Check content length
  if (skill.content.length < 200) {
    warnings.push(`Very short content (${skill.content.length} chars)`);
    score -= 20;
  }

  // Check for examples
  const exampleCount = (skill.content.match(/```/g) || []).length / 2;
  if (exampleCount === 0) {
    warnings.push('No code/example blocks found (recommended)');
    score -= 10;
  }

  return { warnings, score: Math.max(0, score) };
}

/**
 * List all available skills in the skills directory
 *
 * @returns Array of skill names (without .md extension)
 */
export function listAvailableSkills(): string[] {
  const skillsDir = join(__dirname, '..', 'skills');

  try {
    const files = readdirSync(skillsDir);
    return files
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''))
      .sort();
  } catch (error) {
    return [];
  }
}

/**
 * Get metadata for all available skills (without loading full content)
 *
 * Used to show agent what skills are available without loading full content.
 *
 * @returns Array of skill metadata
 */
export async function getSkillsMetadata(): Promise<SkillMetadata[]> {
  const skillNames = listAvailableSkills();
  const metadata: SkillMetadata[] = [];

  for (const name of skillNames) {
    try {
      const skill = await loadSingleSkill(name);
      if (skill) {
        metadata.push(skill.metadata);
      }
    } catch (error) {
      // Skip skills that fail to load
      continue;
    }
  }

  return metadata;
}

/**
 * Load a single skill by name (exported for load_skill tool)
 *
 * @param name - Skill name
 * @returns Loaded skill or null if not found
 */
export async function loadSkillByName(name: string): Promise<Skill | null> {
  return loadSingleSkill(name);
}
