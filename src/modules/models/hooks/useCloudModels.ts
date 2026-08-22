// The picker's list. The cloud-specific two-endpoint dance (recommendations + the /api/tags catalogue) now lives in
// CloudBackend; this hook is backend-agnostic and just asks the active backend for the merged list.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { CloudModel } from "@/modules/models/api/models";
import { CloudBackend } from "@/modules/models/lib/backend";
import { useApi } from "@/lib/contexts/ApiContext";
import { CLOUD_MODELS_STALE_TIME_MS } from "@/modules/models/constants";
import { queryKeys } from "@/lib/hooks/queryKeys";

export function useCloudModels(): UseQueryResult<CloudModel[], Error> {
  const { client } = useApi();
  return useQuery<CloudModel[], Error>({
    queryKey: queryKeys.cloudModels(),
    queryFn: () => new CloudBackend(client).listModels(),
    staleTime: CLOUD_MODELS_STALE_TIME_MS,
  });
}