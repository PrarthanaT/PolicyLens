import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useComparison(drug: string) {
  return useQuery({
    queryKey: ["compare", drug],
    queryFn: () => api.compare.byDrug(drug),
    enabled: drug.length > 0,
    staleTime: 60_000,
  });
}

export function useCompareSummary(drug: string) {
  return useQuery({
    queryKey: ["compare", "summary", drug],
    queryFn: () => api.compare.summary(drug),
    enabled: drug.length > 0,
    staleTime: 60_000,
  });
}
