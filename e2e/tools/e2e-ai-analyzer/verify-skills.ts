/**
 * Simple verification script to test skills architecture
 * Run with: node -r esbuild-register e2e/tools/e2e-ai-analyzer/verify-skills.ts
 */

import { registerAllSkills, SkillRegistry } from './skills';

console.log('🧪 Verifying Skills Architecture...\n');

// Test 1: Skills can be registered
console.log('Test 1: Registering skills...');
registerAllSkills();
console.log(`✅ Registered ${SkillRegistry.size()} skill(s)\n`);

// Test 2: Skills can be listed
console.log('Test 2: Listing skills...');
const skills = SkillRegistry.list();
skills.forEach((skill) => {
  console.log(`  - ${skill.name} (v${skill.version}): ${skill.description}`);
});
console.log('✅ Skills listed successfully\n');

// Test 3: Skills can be retrieved
console.log('Test 3: Retrieving select-tags skill...');
const selectTagsSkill = SkillRegistry.get('select-tags');
console.log(`  Name: ${selectTagsSkill.name}`);
console.log(`  Version: ${selectTagsSkill.version}`);
console.log(`  Description: ${selectTagsSkill.description}`);
console.log('✅ Skill retrieved successfully\n');

// Test 4: Skill has required methods
console.log('Test 4: Checking skill interface...');
const hasGetTools = typeof selectTagsSkill.getTools === 'function';
const hasGetFinalizeToolName =
  typeof selectTagsSkill.getFinalizeToolName === 'function';
const hasBuildSystemPrompt =
  typeof selectTagsSkill.buildSystemPrompt === 'function';
const hasBuildTaskPrompt =
  typeof selectTagsSkill.buildTaskPrompt === 'function';
const hasOutputResult = typeof selectTagsSkill.outputResult === 'function';

console.log(`  getTools: ${hasGetTools ? '✅' : '❌'}`);
console.log(`  getFinalizeToolName: ${hasGetFinalizeToolName ? '✅' : '❌'}`);
console.log(`  buildSystemPrompt: ${hasBuildSystemPrompt ? '✅' : '❌'}`);
console.log(`  buildTaskPrompt: ${hasBuildTaskPrompt ? '✅' : '❌'}`);
console.log(`  outputResult: ${hasOutputResult ? '✅' : '❌'}`);

if (
  hasGetTools &&
  hasGetFinalizeToolName &&
  hasBuildSystemPrompt &&
  hasBuildTaskPrompt &&
  hasOutputResult
) {
  console.log('✅ All required methods present\n');
} else {
  console.log('❌ Missing required methods\n');
  process.exit(1);
}

// Test 5: Tools can be retrieved
console.log('Test 5: Getting tools...');
const tools = selectTagsSkill.getTools();
console.log(`  Found ${tools.length} tools`);
console.log(
  `  Tools: ${tools
    .map((t) => t.name)
    .slice(0, 3)
    .join(', ')}...`,
);
console.log('✅ Tools retrieved successfully\n');

// Test 6: Finalize tool name
console.log('Test 6: Getting finalize tool name...');
const finalizeTool = selectTagsSkill.getFinalizeToolName();
console.log(`  Finalize tool: ${finalizeTool}`);
console.log('✅ Finalize tool name retrieved\n');

// Test 7: Error handling for missing skill
console.log('Test 7: Testing error handling for missing skill...');
try {
  SkillRegistry.get('non-existent-skill');
  console.log('❌ Should have thrown error for missing skill\n');
  process.exit(1);
} catch (error) {
  if (error instanceof Error) {
    console.log(`  Error message: ${error.message}`);
  }
  console.log('✅ Error handling works correctly\n');
}

console.log('🎉 All tests passed! Skills architecture is working correctly.');
