import { expect } from 'chai';
import { withRetry } from '../solver/src/retry';

describe('withRetry', () => {
  it('should return immediately on first success', async () => {
    const result = await withRetry(() => Promise.resolve(42));
    expect(result).to.equal(42);
  });

  it('should retry on failure then succeed', async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'ok';
    }, { baseDelayMs: 10 });

    expect(result).to.equal('ok');
    expect(attempts).to.equal(3);
  });

  it('should throw after exhausting all attempts', async () => {
    try {
      await withRetry(
        () => Promise.reject(new Error('always fails')),
        { maxAttempts: 2, baseDelayMs: 10 },
      );
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.message).to.equal('always fails');
    }
  });

  it('should call onRetry callback with correct attempt number', async () => {
    const retries: number[] = [];
    let attempts = 0;

    await withRetry(async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'ok';
    }, {
      baseDelayMs: 10,
      onRetry: (attempt) => { retries.push(attempt); },
    });

    expect(retries).to.deep.equal([1, 2]);
  });

  it('should not call onRetry on first success', async () => {
    let called = false;
    await withRetry(() => Promise.resolve('ok'), {
      onRetry: () => { called = true; },
    });
    expect(called).to.be.false;
  });

  it('should cap delay at maxDelayMs', async () => {
    let attempts = 0;
    const start = Date.now();

    try {
      await withRetry(
        () => { attempts++; return Promise.reject(new Error('fail')); },
        { maxAttempts: 4, baseDelayMs: 100, maxDelayMs: 150 },
      );
    } catch {}

    // 3 retries: delays should be min(100,150) + min(200,150) + min(400,150) = 100+150+150 = 400ms
    // Without cap: 100+200+400 = 700ms
    const elapsed = Date.now() - start;
    expect(elapsed).to.be.lessThan(600);
    expect(attempts).to.equal(4);
  });

  it('should handle non-Error rejections', async () => {
    try {
      await withRetry(
        () => Promise.reject('string error'),
        { maxAttempts: 1 },
      );
      expect.fail('should have thrown');
    } catch (err: any) {
      expect(err.message).to.equal('string error');
    }
  });
});
