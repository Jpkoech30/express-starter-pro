'use strict';

describe('Retry Logic with Exponential Backoff', () => {
  function createRetryFn(maxRetries, backoffBase, backoffExponent, failCount) {
    let attempts = 0;
    return async () => {
      attempts++;
      if (attempts <= failCount) {
        const delay = backoffBase * Math.pow(backoffExponent, attempts - 1);
        await new Promise((r) => setTimeout(r, delay));
        throw new Error(`Attempt ${attempts} failed`);
      }
      return 'success';
    };
  }

  async function withRetry(fn, config) {
    const { max = 3, backoffBase = 100, backoffExponent = 2 } = config;
    let lastError;

    for (let attempt = 1; attempt <= max; attempt++) {
      try {
        return await fn(attempt);
      } catch (err) {
        lastError = err;
        if (attempt < max) {
          const delay = backoffBase * Math.pow(backoffExponent, attempt - 1);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  test('succeeds on first attempt when no failures', async () => {
    const fn = createRetryFn(3, 100, 2, 0);
    const result = await withRetry(fn, { max: 3, backoffBase: 100, backoffExponent: 2 });
    expect(result).toBe('success');
  });

  test('succeeds after retries', async () => {
    const fn = createRetryFn(3, 100, 2, 2);
    const result = await withRetry(fn, { max: 3, backoffBase: 100, backoffExponent: 2 });
    expect(result).toBe('success');
  });

  test('fails after exhausting retries', async () => {
    const fn = createRetryFn(3, 100, 2, 5);
    await expect(withRetry(fn, { max: 3, backoffBase: 100, backoffExponent: 2 })).rejects.toThrow('Attempt 3 failed');
  });

  test('uses exponential backoff delays', async () => {
    const delays = [];
    const start = Date.now();

    const fn = async (attempt) => {
      delays.push(Date.now() - start);
      if (attempt < 3) throw new Error(`fail ${attempt}`);
      return 'ok';
    };

    await withRetry(fn, { max: 3, backoffBase: 10, backoffExponent: 2 });
    // attempt 1: delay 0, attempt 2: delay 10ms, attempt 3: delay 20ms
    expect(delays[1] - delays[0]).toBeGreaterThanOrEqual(8);
    expect(delays[2] - delays[1]).toBeGreaterThanOrEqual(18);
  });

  test('succeeds with max=1 (no retry)', async () => {
    const fn = createRetryFn(1, 100, 2, 0);
    const result = await withRetry(fn, { max: 1, backoffBase: 100, backoffExponent: 2 });
    expect(result).toBe('success');
  });

  test('fails immediately with max=1 on error', async () => {
    const fn = createRetryFn(1, 100, 2, 1);
    await expect(withRetry(fn, { max: 1, backoffBase: 100, backoffExponent: 2 })).rejects.toThrow('Attempt 1 failed');
  });
});
