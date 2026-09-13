import { describe, expect, test } from 'bun:test';
import { ALL_EVAL_CASES, HELD_OUT_CASES } from './eval-cases';
import { COMPACT_PROMPT_EXAMPLES } from './prompt-examples';

describe('eval cases', () => {
  test('ids are unique', () => {
    const ids = ALL_EVAL_CASES.map(testCase => testCase.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('command cases have a non-empty accept list', () => {
    const empty = ALL_EVAL_CASES.filter(
      testCase => testCase.expectedBehavior === 'command' && testCase.accept.length === 0
    );
    expect(empty).toEqual([]);
  });

  test('held-out inputs do not match compact-prompt few-shots', () => {
    const fewShots = new Set(COMPACT_PROMPT_EXAMPLES.map(example => example.user.toLowerCase()));
    const contaminated = HELD_OUT_CASES.filter(testCase => fewShots.has(testCase.input.toLowerCase()));
    expect(contaminated).toEqual([]);
  });
});
