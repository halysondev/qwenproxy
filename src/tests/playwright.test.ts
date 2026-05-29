import assert from 'node:assert';
import test, { mock } from 'node:test';
import { chromium } from 'playwright';
import type { QwenAccount } from '../core/accounts.ts';
import { closePlaywright, getBasicHeaders, initPlaywrightForAccount } from '../services/playwright.ts';

test('getBasicHeaders falls back to a warmed account when the global page is not initialized', async () => {
  const originalTestMock = process.env.TEST_MOCK_PLAYWRIGHT;
  delete process.env.TEST_MOCK_PLAYWRIGHT;

  const fakeContext = {
    addInitScript: async () => {},
    newPage: async () => fakePage,
    cookies: async () => [{ name: 'token', value: 'account-cookie' }],
    close: async () => {},
  };

  const fakePage = {
    context: () => fakeContext,
    evaluate: async () => 'MockBrowser/1.0',
  };

  const account: QwenAccount = {
    id: 'account-1',
    email: 'account@example.com',
    password: 'secret',
  };

  const launchPersistentContextMock = mock.method(chromium, 'launchPersistentContext', async () => fakeContext as any);

  try {
    await initPlaywrightForAccount(account, true);

    const headers = await getBasicHeaders();

    assert.deepStrictEqual(headers, {
      cookie: 'token=account-cookie',
      userAgent: 'MockBrowser/1.0',
      bxV: '2.5.36',
    });
    assert.strictEqual(launchPersistentContextMock.mock.calls.length, 1);
  } finally {
    launchPersistentContextMock.mock.restore();
    await closePlaywright();

    if (originalTestMock === undefined) {
      delete process.env.TEST_MOCK_PLAYWRIGHT;
    } else {
      process.env.TEST_MOCK_PLAYWRIGHT = originalTestMock;
    }
  }
});