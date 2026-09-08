import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AddressInfo } from 'net';
import { server, app } from '../src/index';

describe('Production Serving & Endpoints', () => {
  let port: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('responds with 200 on /api/health', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(typeof data.timestamp).toBe('number');
  });

  it('responds with config on /api/config', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/config`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('baseUrl');
    expect(data.baseUrl).toContain(`:${port}`);
  });

  it('serves static client html on root / and fallback for SPA routes like /join/XYZ', async () => {
    const rootRes = await fetch(`http://127.0.0.1:${port}/`);
    expect(rootRes.status).toBe(200);
    const rootHtml = await rootRes.text();
    expect(rootHtml).toContain('<div id="root">');

    const spaRes = await fetch(`http://127.0.0.1:${port}/join/ABCDE`);
    expect(spaRes.status).toBe(200);
    const spaHtml = await spaRes.text();
    expect(spaHtml).toContain('<div id="root">');
  });
});
