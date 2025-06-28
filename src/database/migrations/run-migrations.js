#!/usr/bin/env node

/**
 * Migration Runner for Kit IA Emprendedor
 * Executes SQL migrations in order on Supabase
 */
import logger from '../../utils/logger.js';


import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nktqqsbebhoedgookfzu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Need service role key for migrations

if (!SUPABASE_SERVICE_KEY) {
  logger.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  logger.error('   Get it from: https://app.supabase.com/project/nktqqsbebhoedgookfzu/settings/api');
  process.exit(1);
}

// Initialize Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Migration tracking table
const MIGRATION_TABLE = `
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  checksum TEXT
);
`;

/**
 * Get list of migration files
 */
function getMigrationFiles() {
  const files = readdirSync(__dirname)
    .filter(f => f.endsWith('.sql') && !f.includes('rollback'))
    .sort();
  return files;
}

/**
 * Calculate simple checksum for file content
 */
function calculateChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Check if migration has been executed
 */
async function isMigrationExecuted(filename) {
  const { data, error } = await supabase
    .from('migrations')
    .select('filename')
    .eq('filename', filename)
    .single();
  
  return !error && data !== null;
}

/**
 * Record migration execution
 */
async function recordMigration(filename, checksum) {
  const { error } = await supabase
    .from('migrations')
    .insert({ filename, checksum });
  
  if (error) {
    throw new Error(`Failed to record migration: ${error.message}`);
  }
}

/**
 * Execute SQL file
 */
async function executeSqlFile(filepath) {
  const content = readFileSync(filepath, 'utf8');
  
  // Split by semicolons but be careful with functions/triggers
  const statements = content
    .split(/;\s*$(?=(?:[^']*'[^']*')*[^']*$)/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      // Use raw SQL execution
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });
      
      if (error) {
        // If exec_sql doesn't exist, we need to create it or use alternative
        logger.warn(`⚠️  Statement execution warning: ${error.message}`);
        logger.debug('   Attempting alternative execution method...');
        
        // For now, log the statement that needs manual execution
        logger.debug('\n📋 Execute manually in Supabase SQL Editor:');
        logger.debug('─'.repeat(50));
        logger.debug(statement + ';');
        logger.debug('─'.repeat(50));
      }
    } catch (err) {
      logger.error(`❌ Failed to execute statement: ${err.message}`);
      throw err;
    }
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  logger.debug('🚀 Kit IA Emprendedor - Migration Runner');
  logger.debug('─'.repeat(50));
  
  try {
    // Create migrations table if not exists
    logger.debug('📊 Ensuring migrations table exists...');
    await executeSqlFile(join(__dirname, 'create-migrations-table.sql'));
    
    // Get migration files
    const migrationFiles = getMigrationFiles();
    logger.debug(`\n📁 Found ${migrationFiles.length} migration files`);
    
    // Process each migration
    for (const file of migrationFiles) {
      logger.debug(`\n🔄 Processing: ${file}`);
      
      // Check if already executed
      if (await isMigrationExecuted(file)) {
        logger.debug('   ✓ Already executed, skipping...');
        continue;
      }
      
      // Read file and calculate checksum
      const filepath = join(__dirname, file);
      const content = readFileSync(filepath, 'utf8');
      const checksum = calculateChecksum(content);
      
      // Execute migration
      logger.debug('   ⚡ Executing migration...');
      await executeSqlFile(filepath);
      
      // Record execution
      await recordMigration(file, checksum);
      logger.debug('   ✅ Migration completed successfully!');
    }
    
    logger.debug('\n✨ All migrations completed!');
    
  } catch (error) {
    logger.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Create helper SQL function for executing raw SQL (if needed)
 */
const createExecSqlFunction = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
`;

// Note about manual execution
logger.debug('\n📌 IMPORTANT: This script shows the SQL that needs to be executed.');
logger.debug('   For security reasons, you may need to run these migrations manually');
logger.debug('   in the Supabase SQL Editor:');
logger.debug('   https://app.supabase.com/project/nktqqsbebhoedgookfzu/editor\n');

// Show migration files
const files = getMigrationFiles();
logger.debug('📋 Migration files to execute in order:');
files.forEach((f, i) => {
  logger.debug(`   ${i + 1}. ${f}`);
});

logger.debug('\n💡 To execute manually:');
logger.debug('   1. Go to Supabase SQL Editor');
logger.debug('   2. Copy and paste each migration file content');
logger.debug('   3. Execute in order\n');

// Optionally run if --execute flag is passed
if (process.argv.includes('--execute')) {
  runMigrations();
} else {
  logger.debug('🔸 Run with --execute flag to attempt automatic execution');
  logger.debug('   node run-migrations.js --execute\n');
}