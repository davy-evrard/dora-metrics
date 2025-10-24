export interface Team {
  id: number;
  name: string;
  description?: string;
  github_repos: string[];
  created_at: string;
  updated_at: string;
}

export interface MetricsSummary {
  team_id: number;
  team_name: string;
  period: string;
  deployment_frequency: number;
  deployment_count: number;
  lead_time_avg_hours: number;
  lead_time_median_hours: number;
  change_failure_rate: number;
  mttr_hours: number;
  trend: {
    deployment_frequency: number;
    lead_time: number;
    change_failure_rate: number;
  };
}

export interface HistoricalMetric {
  id: number;
  team_id: number;
  date: string;
  deployment_frequency: number;
  deployment_count: number;
  lead_time_avg_hours: number;
  lead_time_median_hours: number;
  change_failure_rate: number;
  mttr_hours: number;
}

export interface ChartDataPoint {
  date: string;
  value?: number;
  count?: number;
  avg?: number;
  median?: number;
  rate?: number;
}
