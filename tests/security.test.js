/**
 * Security Tests for Kit IA Emprendedor Extension
 * 
 * These tests verify that all security measures are properly implemented
 * and that the extension is safe from common vulnerabilities.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  validatePromptTitle,
  validatePromptContent,
  validateTags,
  validateSearch,
  validateUrl,
  validateEmail,
  sanitizeHtml,
  escapeHtml
} from '../src/shared/validation.js';

describe('Security Tests', () => {
  
  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<body onload=alert("XSS")>',
      '<object data="javascript:alert(\'XSS\')">',
      '<embed src="javascript:alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      '\'-alert("XSS")-\'',
      '\";alert("XSS");//',
      '<script>alert(String.fromCharCode(88,83,83))</script>',
      '<<SCRIPT>alert("XSS");//<</SCRIPT>',
      '<META HTTP-EQUIV="refresh" CONTENT="0;url=javascript:alert(\'XSS\');">',
      '<STYLE>@import\'javascript:alert("XSS")\';</STYLE>',
      '<div style="background:url(javascript:alert(\'XSS\'))">',
      '<div style="width: expression(alert(\'XSS\'));">',
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS payload ${index + 1}: ${payload.substring(0, 30)}...`, () => {
        const sanitized = sanitizeHtml(payload);
        expect(sanitized).not.toContain('script');
        expect(sanitized).not.toContain('alert');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onfocus');
      });

      it(`should escape XSS payload ${index + 1} for safe display`, () => {
        const escaped = escapeHtml(payload);
        expect(escaped).not.toContain('<script>');
        expect(escaped).not.toContain('<img');
        expect(escaped).toContain('&lt;');
        expect(escaped).toContain('&gt;');
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "1' OR '1'='1",
      "admin'--",
      "' OR 1=1--",
      "' UNION SELECT * FROM users--",
      "'; DELETE FROM prompts WHERE '1'='1",
      "1'; INSERT INTO users VALUES ('hacker', 'password'); --",
    ];

    sqlPayloads.forEach((payload, index) => {
      it(`should validate and reject SQL injection payload ${index + 1}`, () => {
        const titleResult = validatePromptTitle(payload);
        const searchResult = validateSearch(payload);
        
        // Should either reject or sanitize the input
        if (titleResult.valid) {
          expect(titleResult.value).not.toContain('DROP');
          expect(titleResult.value).not.toContain('DELETE');
          expect(titleResult.value).not.toContain('INSERT');
          expect(titleResult.value).not.toContain('UNION');
        }
        
        // Search should always sanitize
        expect(searchResult.valid).toBe(true);
        expect(searchResult.sanitized).not.toContain("'");
        expect(searchResult.sanitized).not.toContain('"');
      });
    });
  });

  describe('Code Injection Prevention', () => {
    const codePayloads = [
      'eval("alert(1)")',
      'new Function("alert(1)")()',
      'setTimeout("alert(1)", 0)',
      'setInterval("alert(1)", 1000)',
      '${alert(1)}',
      '`${alert(1)}`',
    ];

    codePayloads.forEach((payload, index) => {
      it(`should prevent code injection payload ${index + 1}`, () => {
        const sanitized = sanitizeHtml(payload);
        const escaped = escapeHtml(payload);
        
        expect(sanitized).not.toContain('eval');
        expect(sanitized).not.toContain('Function');
        expect(sanitized).not.toContain('setTimeout');
        expect(sanitized).not.toContain('setInterval');
        
        expect(escaped).not.toContain('${');
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'file:///etc/passwd',
      'file://C:/Windows/System32/config/sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    ];

    pathPayloads.forEach((payload, index) => {
      it(`should prevent path traversal payload ${index + 1}`, () => {
        const urlResult = validateUrl(payload);
        expect(urlResult.valid).toBe(false);
        
        const sanitized = sanitizeHtml(payload);
        expect(sanitized).not.toContain('../');
        expect(sanitized).not.toContain('..\\');
        expect(sanitized).not.toContain('file:');
      });
    });
  });

  describe('URL Validation Security', () => {
    const maliciousUrls = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:alert(1)',
      'file:///etc/passwd',
      'ftp://malicious.com/virus.exe',
      'chrome://settings',
      'about:blank',
      'http://localhost:3000',
      'http://127.0.0.1',
      'http://0.0.0.0',
      'http://[::1]',
      'https://user:pass@malicious.com',
      'https://google.com@malicious.com',
      'https://malicious.com#@google.com',
      'https://malicious.com?.google.com',
    ];

    maliciousUrls.forEach((url, index) => {
      it(`should reject malicious URL ${index + 1}: ${url}`, () => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Input Size Limits', () => {
    it('should enforce prompt title length limits', () => {
      const tooShort = 'ab';
      const tooLong = 'a'.repeat(101);
      const justRight = 'Valid Title';
      
      expect(validatePromptTitle(tooShort).valid).toBe(false);
      expect(validatePromptTitle(tooLong).valid).toBe(false);
      expect(validatePromptTitle(justRight).valid).toBe(true);
    });

    it('should enforce prompt content length limits', () => {
      const tooShort = 'Too short';
      const tooLong = 'a'.repeat(5001);
      const justRight = 'This is a valid prompt content with more than 10 characters';
      
      expect(validatePromptContent(tooShort).valid).toBe(false);
      expect(validatePromptContent(tooLong).valid).toBe(false);
      expect(validatePromptContent(justRight).valid).toBe(true);
    });

    it('should enforce tag limits', () => {
      const tooManyTags = Array(11).fill('tag');
      const tooLongTag = ['a'.repeat(31)];
      const validTags = ['react', 'javascript', 'frontend'];
      
      expect(validateTags(tooManyTags).valid).toBe(false);
      expect(validateTags(tooLongTag).valid).toBe(false);
      expect(validateTags(validTags).valid).toBe(true);
    });
  });

  describe('Email Validation Security', () => {
    const maliciousEmails = [
      'test@example.com<script>alert(1)</script>',
      'user+tag@domain.com?subject=<script>',
      '"user; DROP TABLE users;"@example.com',
      'user@domain.com\r\nBcc: attacker@evil.com',
      'user@domain.com%0ABcc:attacker@evil.com',
    ];

    maliciousEmails.forEach((email, index) => {
      it(`should reject malicious email ${index + 1}`, () => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Special Characters Handling', () => {
    it('should properly handle Spanish characters', () => {
      const spanishTitle = 'Título con ñ y acentos áéíóú';
      const result = validatePromptTitle(spanishTitle);
      expect(result.valid).toBe(true);
      expect(result.value).toBe(spanishTitle);
    });

    it('should escape HTML entities correctly', () => {
      const text = '<div>"Hello" & \'World\'</div>';
      const escaped = escapeHtml(text);
      expect(escaped).toBe('&lt;div&gt;&quot;Hello&quot; &amp; &#39;World&#39;&lt;/div&gt;');
    });
  });

  describe('Null and Undefined Handling', () => {
    const nullishValues = [null, undefined, '', NaN, 0, false];

    nullishValues.forEach((value, index) => {
      it(`should safely handle nullish value ${index + 1}: ${value}`, () => {
        expect(() => validatePromptTitle(value)).not.toThrow();
        expect(() => validatePromptContent(value)).not.toThrow();
        expect(() => sanitizeHtml(value)).not.toThrow();
        expect(() => escapeHtml(value)).not.toThrow();
      });
    });
  });

  describe('ReDoS Prevention', () => {
    it('should not be vulnerable to ReDoS attacks', () => {
      const redosPayload = 'a'.repeat(1000) + '!';
      const start = Date.now();
      
      validatePromptTitle(redosPayload);
      validateSearch(redosPayload);
      validateEmail(redosPayload + '@example.com');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete quickly
    });
  });

  describe('Content Security Policy Compliance', () => {
    it('should not use eval or Function constructor', () => {
      const codeStr = sanitizeHtml.toString() + escapeHtml.toString();
      expect(codeStr).not.toContain('eval(');
      expect(codeStr).not.toContain('new Function(');
      expect(codeStr).not.toContain('setTimeout(');
      expect(codeStr).not.toContain('setInterval(');
    });
  });
});