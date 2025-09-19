import { describe, it, expect } from 'vitest';
import { sharedHello } from '../src/index';

describe('sharedHello', () => {
  it('returns readiness string', () => {
    expect(sharedHello()).toBe('dribble-shared-ready');
  });
});
