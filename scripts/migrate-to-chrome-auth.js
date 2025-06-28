#!/usr/bin/env node

/**
 * Script de migración para usar chrome-auth.js en lugar de auth.js
 * Este script actualiza todas las importaciones para usar el módulo correcto
 */

import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';

async function migrateFile(filePath) {
  try {
    let content = await readFile(filePath, 'utf-8');
    let modified = false;

    // Patterns to replace
    const replacements = [
      {
        from: /import\s+{\s*auth\s*}\s+from\s+['"]\.\.?\/shared\/auth\.js['"]/g,
        to: "import { auth } from '../shared/chrome-auth.js'"
      },
      {
        from: /import\s+auth\s+from\s+['"]\.\.?\/shared\/auth\.js['"]/g,
        to: "import auth from '../shared/chrome-auth.js'"
      },
      {
        from: /import\s+{\s*auth\s*}\s+from\s+['"]@shared\/auth\.js['"]/g,
        to: "import { auth } from '@shared/chrome-auth.js'"
      },
      {
        from: /import\s+auth\s+from\s+['"]@shared\/auth\.js['"]/g,
        to: "import auth from '@shared/chrome-auth.js'"
      }
    ];

    for (const { from, to } of replacements) {
      if (from.test(content)) {
        content = content.replace(from, to);
        modified = true;
      }
    }

    if (modified) {
      await writeFile(filePath, content, 'utf-8');
      console.log(`✅ Migrated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error migrating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 Starting migration to chrome-auth.js...\n');

  // Find all JavaScript files that might import auth.js
  const files = await glob('src/**/*.js', {
    ignore: [
      'src/shared/auth.js',
      'src/shared/chrome-auth.js',
      'src/shared/auth.example.js',
      'src/**/*.test.js'
    ]
  });

  console.log(`Found ${files.length} files to check...\n`);

  let migratedCount = 0;
  for (const file of files) {
    const migrated = await migrateFile(file);
    if (migrated) migratedCount++;
  }

  console.log(`\n✨ Migration complete! ${migratedCount} files updated.`);
  
  if (migratedCount > 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Run "npm run build" to rebuild the extension');
    console.log('2. Test authentication thoroughly');
    console.log('3. Update any remaining references manually if needed');
  }
}

main().catch(console.error);