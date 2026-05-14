export interface DrugSearchResult {
  id: number;
  policy_id: number;
  payer: string;
  policy_title: string;
  effective_date: string | null;
  drug_name: string;
  generic_name: string | null;
  brand_names: string[] | null;
  hcpcs_code: string | null;
  access_status_group: string | null;
  drug_category: string | null;
  prior_auth_required: number | null;
  step_therapy_required: number | null;
  site_of_care_required: number | null;
  dosing_limit_summary: string | null;
  covered_diagnoses: string[] | null;
  coverage_level: string | null;
  notes: string | null;
}

export interface TrendingDrug {
  drug_name: string;
  payer_count: number;
}

export interface PayerComparison {
  id: number;
  policy_id: number;
  payer: string;
  policy_title: string;
  effective_date: string | null;
  drug_name: string;
  generic_name: string | null;
  brand_names: string[] | null;
  hcpcs_code: string | null;
  hcpcs_codes: string[] | null;
  access_status_group: string | null;
  coverage_level: string | null;
  drug_category: string | null;
  prior_auth_required: number | null;
  prior_auth_criteria: string | null;
  step_therapy_required: number | null;
  step_therapy_details: string | null;
  site_of_care_required: number | null;
  site_of_care_details: string | null;
  dosing_limit_summary: string | null;
  covered_diagnoses: string[] | null;
  notes: string | null;
}

export interface SummaryMetric {
  label: string;
  value: string;
  detail: string;
  primary?: boolean;
}

export interface CompareSummary {
  payer_coverage: SummaryMetric;
  total_entries: SummaryMetric;
  clinical_variance: SummaryMetric;
  market_access_score: SummaryMetric;
}

export interface DrugPayerCoverage {
  covered: boolean;
  status: string | null;
  prior_auth: boolean;
}

export interface CoverageMatrix {
  payers: string[];
  drugs: Record<string, Record<string, DrugPayerCoverage>>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PolicySummary {
  id: number;
  payer: string;
  policy_title: string | null;
  document_type: string | null;
  effective_date: string | null;
  revision_date: string | null;
  prior_auth_required: number | null;
  site_of_care_restrictions: string | null;
  drug_count: number;
  pa_drug_count: number;
  step_therapy_drug_count: number;
}

export interface PolicyStats {
  total_policies: number;
  total_payers: number;
  total_drugs: number;
  latest_indexed: string;
}

export interface PolicyChange {
  policy_id: number;
  payer: string;
  policy_title: string | null;
  effective_date: string | null;
  change_date: string;
  description: string;
  severity: string;
}

export interface ChangesStats {
  total_changes: number;
  clinical_updates: number;
  coding_updates: number;
  policies_with_changes: number;
}

export interface IngestStatus {
  total_policies: number;
  total_drugs: number;
  total_payers: number;
  recent_ingestions: { source_filename: string; payer: string; policy_title: string }[];
}

export interface IngestResult {
  status: string;
  policy_id: number;
  payer: string;
  policy_title: string;
  drugs_extracted: number;
  text_length: number;
}
