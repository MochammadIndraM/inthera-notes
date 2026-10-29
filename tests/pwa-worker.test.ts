import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { createServiceWorker } from "@/lib/pwa/service-worker";

const origin = "https://notes.example.test";
function worker() {
  const handlers = new Map<string, (event: unknown) => void>();
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    match: vi.fn(),
  };
  const storage = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi
      .fn()
      .mockResolvedValue(["inthera-pwa-old", "inthera-pwa-test", "other-app"]),
    delete: vi.fn().mockResolvedValue(true),
  };
  const fetch = vi.fn();
  const self = {
    location: { origin },
    clients: { claim: vi.fn().mockResolvedValue(undefined) },
    skipWaiting: vi.fn().mockResolvedValue(undefined),
    addEventListener: (name: string, handler: (event: unknown) => void) =>
      handlers.set(name, handler),
  };
  class BrowserRequest extends Request {
    constructor(path: string, init?: RequestInit) {
      super(new URL(path, origin), init);
    }
  }
  runInNewContext(createServiceWorker("test"), {
    self,
    caches: storage,
    fetch,
    URL,
    Request: BrowserRequest,
    Response,
  });
  async function dispatch(name: string, input: Record<string, unknown> = {}) {
    let result: Promise<unknown> | undefined;
    handlers.get(name)?.({
      ...input,
      waitUntil: (promise: Promise<unknown>) => {
        result = promise;
      },
      respondWith: (promise: Promise<unknown>) => {
        result = promise;
      },
    });
    return await result;
  }
  return { self, storage, cache, fetch, dispatch };
}
describe("PWA cache dan navigasi", () => {
  it("hanya menyiapkan halaman offline dan ikon publik tanpa cookie", async () => {
    const w = worker();
    await w.dispatch("install");
    const requests = w.cache.addAll.mock.calls[0][0] as Request[];
    expect(requests.map((r) => new URL(r.url).pathname)).toEqual([
      "/offline.html",
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/maskable-512.png",
      "/icons/apple-touch-icon.png",
    ]);
    expect(requests.every((r) => r.credentials === "omit")).toBe(true);
    expect(w.self.skipWaiting).not.toHaveBeenCalled();
  });
  it("menghapus cache versi lama milik aplikasi tanpa menyentuh cache lain", async () => {
    const w = worker();
    await w.dispatch("activate");
    expect(w.storage.delete.mock.calls).toEqual([["inthera-pwa-old"]]);
    expect(w.self.clients.claim).toHaveBeenCalledOnce();
  });
  it("halaman privat selalu dari jaringan, tidak dimasukkan cache", async () => {
    const w = worker();
    w.fetch.mockResolvedValue(new Response("private user data"));
    const result = (await w.dispatch("fetch", {
      request: { url: origin + "/finance", method: "GET", mode: "navigate" },
    })) as Response;
    expect(await result.text()).toBe("private user data");
    expect(w.storage.open).not.toHaveBeenCalled();
    expect(w.cache.addAll).not.toHaveBeenCalled();
  });
  it("navigasi tanpa jaringan mendapat halaman offline tanpa data pengguna", async () => {
    const w = worker();
    w.fetch.mockRejectedValue(new Error("offline"));
    w.cache.match.mockResolvedValue(new Response("public offline page"));
    const result = (await w.dispatch("fetch", {
      request: { url: origin + "/dashboard", method: "GET", mode: "navigate" },
    })) as Response;
    expect(await result.text()).toBe("public offline page");
    expect(w.cache.match).toHaveBeenCalledWith("/offline.html");
  });
  it.each([
    { url: origin + "/tasks", method: "POST", mode: "cors" },
    { url: origin + "/tasks?_rsc=private", method: "GET", mode: "cors" },
    { url: origin + "/api/export", method: "GET", mode: "navigate" },
    {
      url: "https://project.supabase.co/rest/v1/tasks",
      method: "GET",
      mode: "cors",
    },
  ])("membiarkan mutasi/API/RSC/lintas origin: $url", async (request) => {
    const w = worker();
    expect(await w.dispatch("fetch", { request })).toBeUndefined();
    expect(w.fetch).not.toHaveBeenCalled();
    expect(w.storage.open).not.toHaveBeenCalled();
  });
  it("memberi 503 yang jelas bila cache offline tidak tersedia", async () => {
    const w = worker();
    w.fetch.mockRejectedValue(new Error("offline"));
    w.cache.match.mockResolvedValue(undefined);
    const result = (await w.dispatch("fetch", {
      request: { url: origin + "/tasks", method: "GET", mode: "navigate" },
    })) as Response;
    expect(result.status).toBe(503);
    expect(await result.text()).toContain("Koneksi terputus");
  });
  it("pembaruan menunggu pesan eksplisit dari pengguna", async () => {
    const w = worker();
    await w.dispatch("message", { data: { type: "OTHER" } });
    expect(w.self.skipWaiting).not.toHaveBeenCalled();
    await w.dispatch("message", { data: { type: "SKIP_WAITING" } });
    expect(w.self.skipWaiting).toHaveBeenCalledOnce();
  });
});
