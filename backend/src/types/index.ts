export interface Team {
  id: number;
  name: string;
  description?: string;
  github_repos: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Deployment {
  id: number;
  team_id: number;
  repo_name: string;
  commit_sha: string;
  branch: string;
  environment: string;
  status: 'success' | 'failed' | 'running';
  deployed_at: Date;
  duration_seconds?: number;
  triggered_by?: string;
  circleci_build_num?: number;
  circleci_workflow_id?: string;
  created_at: Date;
}

export interface Commit {
  id: number;
  team_id: number;
  repo_name: string;
  sha: string;
  author: string;
  message: string;
  committed_at: Date;
  pr_number?: number;
  pr_created_at?: Date;
  pr_merged_at?: Date;
  files_changed: number;
  additions: number;
  deletions: number;
  created_at: Date;
}

export interface PullRequest {
  id: number;
  team_id: number;
  repo_name: string;
  pr_number: number;
  title: string;
  author: string;
  state: 'open' | 'closed' | 'merged';
  created_at: Date;
  merged_at?: Date;
  closed_at?: Date;
  first_commit_at?: Date;
  base_branch: string;
  head_branch: string;
  commits_count: number;
  additions: number;
  deletions: number;
  files_changed: number;
}

export interface DoraMetrics {
  id: number;
  team_id: number;
  date: Date;
  deployment_frequency: number;
  deployment_count: number;
  lead_time_avg_hours: number;
  lead_time_median_hours: number;
  change_failure_rate: number;
  mttr_hours: number;
  created_at: Date;
  updated_at: Date;
}

export interface MetricsSummary {
  team_id: number;
  team_name: string;
  period: string; // '7d', '30d', '90d'
  deployment_frequency: number;
  deployment_count: number;
  lead_time_avg_hours: number;
  lead_time_median_hours: number;
  change_failure_rate: number;
  mttr_hours: number;
  trend: {
    deployment_frequency: number; // percentage change
    lead_time: number;
    change_failure_rate: number;
  };
}
