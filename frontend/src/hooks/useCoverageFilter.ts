import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useDrugNames(query: string) {
  return useQuery({
    queryKey: ["drugNames", query],
    queryFn: () => api.drugs.names(query),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export function useCoverageMatrix(drugs: string[]) {
  return useQuery({
    queryKey: ["coverageMatrix", ...drugs],
    queryFn: () => api.drugs.coverage(drugs),
    enabled: drugs.length > 0,
  });
}
