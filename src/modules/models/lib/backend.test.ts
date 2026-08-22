import { ApiClient } from "@/lib/api/client";
import { CloudBackend } from "@/modules/models/lib/backend";

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

function installFetchMock(): FetchMock {
  const m = jest.fn() as FetchMock;
  (globalThis as { fetch: typeof fetch }).fetch = m as unknown as typeof fetch;
  return m;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeClient(): ApiClient {
  return new ApiClient({
    baseUrl: "https://example.com",
    getKeypair: () => null,
  });
}

describe("CloudBackend", () => {
  let fetchMock: FetchMock;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = installFetchMock();
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it("listModels merges the recommendations and the catalogue, featured first", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, {
          recommendations: [{ model: "glm-5.2:cloud", description: "Reasoning" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { models: [{ name: "glm-5.2" }, { name: "kimi-k3" }] }),
      );

    const models = await new CloudBackend(makeClient()).listModels();

    expect(models.map((m) => m.name)).toEqual(["glm-5.2", "kimi-k3"]);
    expect(models[0].description).toBe("Reasoning");
  });

  // A catalogue failure must degrade to the featured few rather than empty the picker.
  it("listModels falls back to the featured cloud subset when the catalogue fails", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(200, { recommendations: [{ model: "glm-5.2:cloud" }] }),
      )
      .mockResolvedValueOnce(jsonResponse(500, { error: "down" }));

    const models = await new CloudBackend(makeClient()).listModels();

    expect(models.map((m) => m.name)).toEqual(["glm-5.2:cloud"]);
    expect(warn).toHaveBeenCalled();
  });

  it("fetchModelCapabilities delegates to the cloud /api/show wire", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { capabilities: ["vision"] }),
    );

    const caps = await new CloudBackend(makeClient()).fetchModelCapabilities("glm-5.2:cloud");

    expect(caps).toEqual(["vision"]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.com/api/show");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ model: "glm-5.2:cloud" });
  });
});