---
name: skill-creator
description: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends the assistant's capabilities with specialized knowledge, workflows, or tool integrations.
---

# Skill Creator

This skill provides guidance for creating effective skills.

## Quick Reference

Skills are modular packages that extend the assistant's capabilities with specialized knowledge, workflows, and tools. Each skill requires a `SKILL.md` file and may include bundled resources (`scripts/`, `references/`, `assets/`).

For detailed information about skills and the creation process, see the Creation Process Overview below.

## Skill Structure

```
skill-name/
├── SKILL.md              # Required: metadata + instructions
├── scripts/              # Optional: executable code
├── references/           # Optional: documentation for context
└── assets/               # Optional: files for output
```

## Creation Process Overview

1. **Understand** - Gather concrete examples of skill usage
2. **Plan** - Identify reusable scripts, references, and assets
3. **Initialize** - Run `scripts/init_skill.py <name> --path <dir>`
4. **Edit** - Implement resources and update SKILL.md
5. **Package** - Run `scripts/package_skill.py <skill-folder>`
6. **Iterate** - Test and refine based on real usage

For step-by-step details, follow the process outlined above.

## Key Scripts

| Script | Purpose |
|--------|---------|
| `scripts/init_skill.py` | Initialize a new skill template |
| `scripts/package_skill.py` | Validate and package a skill |
| `scripts/quick_validate.py` | Quick validation check |
