import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useDrugSearch(query: string) {
  return useQuery({
    queryKey: ["drugs", "search", query],
    queryFn: () => api.drugs.search(query),
    enabled: query.length > 0,
    staleTime: 60_000,
  });
}

export function useTrendingDrugs() {
  return useQuery({
    queryKey: ["drugs", "trending"],
    queryFn: api.drugs.trending,
    staleTime: 300_000,
  });
}
