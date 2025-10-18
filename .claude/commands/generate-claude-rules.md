## Overview

Generate CLAUDE.md by dynamically aggregating all rules from `.cursor/rules/` directory. Works regardless of which rules exist or are added/removed.

## Steps

1. **Discover all rule files**

   - Scan `.cursor/rules/` for all `.mdc` files
   - Extract title/name from each file (frontmatter or first heading)
   - Identify main sections and guidelines

2. **Analyze content dynamically**

   - Extract core content (skip frontmatter)
   - Identify overlapping sections and consolidate
   - Determine logical organization based on content
   - Group related content semantically

3. **Generate structure**

   - Create table of contents from discovered content
   - Organize into logical sections based on analysis
   - Use rule file names/titles as section headers

4. **Consolidate content**

   - Merge all rules into appropriate sections
   - Remove duplicates automatically
   - Preserve formatting, examples, code blocks
   - Keep all enforcement rules
   - Maintain unique content from each file

5. **Handle CLAUDE.md existence**
   - If no file: Create new with consolidated content
   - If exists: Prompt user:
     ```
     CLAUDE.md exists. Choose:
     1. Replace - Overwrite with new consolidated content
     2. Merge - Combine existing content with new rules
     ```
   - Ensure proper markdown formatting
   - Maintain single source of truth

## Checklist

- [ ] All `.cursor/rules/` files analyzed
- [ ] Structure planned and overlaps identified
- [ ] CLAUDE.md existence checked
- [ ] User preference obtained (if file exists)
- [ ] CLAUDE.md created/updated with all content
- [ ] Formatting, examples, enforcement preserved
- [ ] Table of contents updated
- [ ] Single source of truth maintained

## Dynamic Organization

1. **Analyze each file**: Extract headings, identify themes, determine logical flow
2. **Create adaptive sections**: Use file names as headers, group related content, preserve hierarchy
3. **Handle consolidation**: Merge duplicates, preserve unique content, keep original formatting
4. **Generate TOC**: Based on discovered structure, ensure proper linking

## File Existence Handling

**No CLAUDE.md**: Create new file (no user interaction)

**CLAUDE.md exists**: Prompt user → "Replace" (overwrite) or "Merge" (combine)

## Success Criteria

- CLAUDE.md contains all rules from `.cursor/rules/`
- Well-organized and easy to navigate
- All formatting preserved
- Duplicates consolidated
- Works with any number of rule files (0 to N)
- New rules auto-included, removed rules auto-excluded
