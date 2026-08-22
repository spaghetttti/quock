// The operations a connection mode needs from its model backend. `CloudBackend` is the default (ollama.com); an
// opt-in Open WebUI mode adds a second impl later. Streaming lands with its second producer, not before.
import type { ApiClient } from "@/lib/api/client";
import {
  fetchModelCapabilities as fetchCloudCapabilities,
  listCloudCatalogue,
  listCloudModels,
  mergeCloudModels,
  type CloudModel,
} from "@/modules/models/api/models";

export interface Backend {
  listModels(): Promise<CloudModel[]>;
  fetchModelCapabilities(name: string): Promise<string[]>;
}

// Default backend: ollama.com, Ed25519-signed via ApiClient. The two-endpoint model dance (recommendations + the
// /api/tags catalogue) is cloud-specific, so it lives here rather than in the hook.
export class CloudBackend implements Backend {
  constructor(private readonly client: ApiClient) {}

  async listModels(): Promise<CloudModel[]> {
    const recommended = await listCloudModels(this.client);
    // The catalogue is the better source but not a reason to lose the list: a failure degrades to the featured few
    // rather than to an empty picker. mergeCloudModels treats an empty catalogue as exactly that case.
    let catalogue: string[] = [];
    try {
      catalogue = await listCloudCatalogue(this.client);
    } catch (err) {
      console.warn("CloudBackend: cloud catalogue unavailable", err);
    }
    return mergeCloudModels(recommended, catalogue);
  }

  fetchModelCapabilities(name: string): Promise<string[]> {
    return fetchCloudCapabilities(this.client, name);
  }
}