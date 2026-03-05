'use client';

export interface BuildExercismRunSourceOptions {
  solutionCode: string;
  testCode?: string;
  slug?: string;
}

function stripImports(code: string): string {
  return code
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('import '))
    .join('\n');
}

function stripExports(code: string): string {
  // Very small heuristic transform to make Exercism's ESM skeleton runnable as a single Node script.
  // We intentionally keep this conservative and line-based.
  return code
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(const|let|var|function|class)\s+/gm, '$1 ')
    .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, '');
}

function normalizeNewlines(code: string): string {
  return code.replace(/\r\n/g, '\n');
}

function stripJestGlobalsImport(testCode: string): string {
  // Typical Exercism tests: `import { describe, expect, test, xtest } from '@jest/globals';`
  // Remove any import from @jest/globals.
  return testCode
    .split('\n')
    .filter((line) => !line.includes("from '@jest/globals'"))
    .join('\n');
}

export function buildExercismRunSource({
  solutionCode,
  testCode,
  slug,
}: BuildExercismRunSourceOptions): string {
  const normalizedSolution = stripExports(stripImports(normalizeNewlines(solutionCode))).trim();
  const normalizedTests = stripImports(stripJestGlobalsImport(normalizeNewlines(testCode ?? ''))).trim();

  // If we don't have tests, just run the solution as-is.
  if (!normalizedTests) {
    return normalizedSolution || "console.log('No code to run');";
  }

  // Minimal Jest-like harness to run Exercism tests in Judge0's Node runtime (no dependencies).
  // We fail the process (exit_code=1) when any test fails so Judge0 marks it as not accepted.
  const harness = [
    "'use strict';",
    '',
    "const util = require('util');",
    'const isDeepStrictEqual = util.isDeepStrictEqual || ((a, b) => JSON.stringify(a) === JSON.stringify(b));',
    '',
    'const __tests = [];',
    '',
    'function describe(_name, fn) {',
    '  fn();',
    '}',
    'describe.skip = function (_name, _fn) {};',
    '',
    'function __pushTest(name, fn, skip) {',
    '  __tests.push({ name, fn, skip: !!skip });',
    '}',
    '',
    'function test(name, fn) {',
    '  __pushTest(name, fn, false);',
    '}',
    'test.skip = function (name, fn) {',
    '  __pushTest(name, fn, true);',
    '};',
    '',
    'function it(name, fn) {',
    '  return test(name, fn);',
    '}',
    'it.skip = test.skip;',
    '',
    'function xtest(name, fn) {',
    '  __pushTest(name, fn, true);',
    '}',
    'function xdescribe(_name, _fn) {}',
    'function xit(name, fn) {',
    '  __pushTest(name, fn, true);',
    '}',
    '',
    'function __format(v) {',
    '  try {',
    "    return typeof v === 'string' ? JSON.stringify(v) : util.inspect(v, { depth: 10, colors: false });",
    '  } catch {',
    '    return String(v);',
    '  }',
    '}',
    '',
    'function __makeMatchers(received, invert) {',
    '  const assert = (cond, message) => {',
    '    if (invert ? cond : !cond) {',
    '      throw new Error(message);',
    '    }',
    '  };',
    '',
    '  const api = {',
    '    toBe(expected) {',
    "      assert(received === expected, 'Expected ' + __format(received) + ' to be ' + __format(expected));",
    '    },',
    '    toEqual(expected) {',
    "      assert(isDeepStrictEqual(received, expected), 'Expected ' + __format(received) + ' to equal ' + __format(expected));",
    '    },',
    '    toStrictEqual(expected) {',
    "      assert(isDeepStrictEqual(received, expected), 'Expected ' + __format(received) + ' to strictly equal ' + __format(expected));",
    '    },',
    '    toBeTruthy() {',
    "      assert(!!received, 'Expected ' + __format(received) + ' to be truthy');",
    '    },',
    '    toBeFalsy() {',
    "      assert(!received, 'Expected ' + __format(received) + ' to be falsy');",
    '    },',
    '    toBeNull() {',
    "      assert(received === null, 'Expected ' + __format(received) + ' to be null');",
    '    },',
    '    toBeUndefined() {',
    "      assert(received === undefined, 'Expected ' + __format(received) + ' to be undefined');",
    '    },',
    '    toContain(item) {',
    '      const ok =',
    "        typeof received === 'string'",
    '          ? received.includes(String(item))',
    '          : Array.isArray(received)',
    '            ? received.includes(item)',
    '            : false;',
    "      assert(ok, 'Expected ' + __format(received) + ' to contain ' + __format(item));",
    '    },',
    '    toHaveLength(len) {',
    "      assert(received != null && received.length === len, 'Expected length ' + len + ', got ' + (received && received.length));",
    '    },',
    '    toMatch(re) {',
    '      const rx = re instanceof RegExp ? re : new RegExp(String(re));',
    "      assert(typeof received === 'string' && rx.test(received), 'Expected ' + __format(received) + ' to match ' + String(rx));",
    '    },',
    '    toThrow(expectedMessage) {',
    "      if (typeof received !== 'function') {",
    "        throw new Error('toThrow() expects a function, got ' + typeof received);",
    '      }',
    '      let threw = false;',
    '      let err;',
    '      try {',
    '        received();',
    '      } catch (e) {',
    '        threw = true;',
    '        err = e;',
    '      }',
    '      if (!invert && !threw) {',
    "        throw new Error('Expected function to throw, but it did not');",
    '      }',
    '      if (invert && threw) {',
    "        throw new Error('Expected function not to throw, but it threw: ' + String((err && err.message) || err));",
    '      }',
    '      if (!invert && expectedMessage !== undefined) {',
    '        const msg = String((err && err.message) || err);',
    '        const ok = expectedMessage instanceof RegExp ? expectedMessage.test(msg) : msg.includes(String(expectedMessage));',
    '        if (!ok) {',
    "          throw new Error('Expected error message to match ' + __format(expectedMessage) + ', got ' + __format(msg));",
    '        }',
    '      }',
    '    },',
    '  };',
    '',
    "  Object.defineProperty(api, 'not', {",
    '    get() {',
    '      return __makeMatchers(received, !invert);',
    '    },',
    '  });',
    '',
    '  return api;',
    '}',
    '',
    'function expect(received) {',
    '  return __makeMatchers(received, false);',
    '}',
    '',
    'async function __runTests() {',
    '  let passed = 0;',
    '  let failed = 0;',
    '  let skipped = 0;',
    '',
    `  const suite = ${JSON.stringify(slug ?? 'exercism-task')};`,
    "  console.log('Running tests for: ' + suite);",
    '',
    '  for (const t of __tests) {',
    '    if (t.skip) {',
    '      skipped++;',
    '      continue;',
    '    }',
    '    try {',
    '      const res = t.fn();',
    "      if (res && typeof res.then === 'function') {",
    '        await res;',
    '      }',
    '      passed++;',
    '    } catch (e) {',
    '      failed++;',
    "      const msg = e && e.stack ? e.stack : String(e);",
    "      console.error('\\nFAIL: ' + t.name + '\\n' + msg + '\\n');",
    '    }',
    '  }',
    '',
    "  console.log('\\nSummary: ' + passed + ' passed, ' + failed + ' failed, ' + skipped + ' skipped');",
    '  process.exitCode = failed > 0 ? 1 : 0;',
    '}',
    '',
  ].join('\n');

  return [harness, normalizedSolution, normalizedTests, '__runTests();'].join('\n\n');
}

