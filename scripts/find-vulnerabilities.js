#!/usr/bin/env node

/**
 * Script para encontrar vulnerabilidades en el código
 * Ejecutar: node scripts/find-vulnerabilities.js
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const PATTERNS = {
  innerHTML: /\.innerHTML\s*=|\.innerHTML\s*\+=|innerHTML:/g,
  console: /console\.\w+\(/g,
  todo: /\/\/\s*(TODO|FIXME|HACK|XXX):/gi,
  hardcodedKeys: /['"]eyJ[A-Za-z0-9+/=]+['"]/g,
  dangerousPerms: /\*:\/\/\*\/\*/g,
  setTimeout: /setTimeout\s*\(/g,
  eval: /eval\s*\(/g,
  documentWrite: /document\.write/g
};

const IGNORE_DIRS = ['node_modules', 'dist', '.git', 'coverage', '.vscode'];
const IGNORE_FILES = ['find-vulnerabilities.js', 'secure-dom.js', 'logger.js'];

async function findFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        await findFiles(fullPath, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      if (!IGNORE_FILES.includes(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

async function scanFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const issues = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check each pattern
    for (const [name, pattern] of Object.entries(PATTERNS)) {
      if (pattern.test(line)) {
        issues.push({
          type: name,
          line: lineNum,
          content: line.trim(),
          file: filePath
        });
      }
    }
  });
  
  return issues;
}

async function main() {
  console.log('🔍 Scanning for vulnerabilities...\n');
  
  const srcPath = join(process.cwd(), 'src');
  const files = await findFiles(srcPath);
  
  const results = {
    innerHTML: [],
    console: [],
    todo: [],
    hardcodedKeys: [],
    dangerousPerms: [],
    setTimeout: [],
    eval: [],
    documentWrite: []
  };
  
  let totalIssues = 0;
  
  for (const file of files) {
    const issues = await scanFile(file);
    
    issues.forEach(issue => {
      results[issue.type].push({
        file: issue.file.replace(process.cwd(), '.'),
        line: issue.line,
        content: issue.content
      });
      totalIssues++;
    });
  }
  
  // Report results
  console.log('📊 VULNERABILITY REPORT\n');
  console.log('=' .repeat(80));
  
  for (const [type, issues] of Object.entries(results)) {
    if (issues.length > 0) {
      console.log(`\n🚨 ${type.toUpperCase()} (${issues.length} found):`);
      console.log('-'.repeat(80));
      
      issues.forEach(issue => {
        console.log(`📍 ${issue.file}:${issue.line}`);
        console.log(`   ${issue.content}`);
      });
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n📈 TOTAL ISSUES: ${totalIssues}`);
  
  if (results.innerHTML.length > 0) {
    console.log('\n⚠️  CRITICAL: innerHTML usage detected!');
    console.log('   Replace with SecureDOM.setHTML() or element.textContent');
  }
  
  if (results.eval.length > 0) {
    console.log('\n🚫 CRITICAL: eval() usage detected!');
    console.log('   This is a severe security risk!');
  }
  
  if (results.hardcodedKeys.length > 0) {
    console.log('\n🔑 WARNING: Possible hardcoded keys detected!');
    console.log('   Move to environment variables');
  }
  
  console.log('\n✅ Scan complete!');
}

main().catch(console.error);