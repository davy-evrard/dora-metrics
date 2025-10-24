-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    github_repos TEXT[], -- Array of repository names
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deployments table
CREATE TABLE IF NOT EXISTS deployments (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    repo_name VARCHAR(255) NOT NULL,
    commit_sha VARCHAR(40) NOT NULL,
    branch VARCHAR(255) NOT NULL,
    environment VARCHAR(50) DEFAULT 'production',
    status VARCHAR(50) NOT NULL, -- success, failed, running
    deployed_at TIMESTAMP NOT NULL,
    duration_seconds INTEGER, -- deployment duration
    triggered_by VARCHAR(255),
    circleci_build_num INTEGER,
    circleci_workflow_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(repo_name, commit_sha, deployed_at)
);

-- Commits table
CREATE TABLE IF NOT EXISTS commits (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    repo_name VARCHAR(255) NOT NULL,
    sha VARCHAR(40) NOT NULL UNIQUE,
    author VARCHAR(255) NOT NULL,
    message TEXT,
    committed_at TIMESTAMP NOT NULL,
    pr_number INTEGER,
    pr_created_at TIMESTAMP,
    pr_merged_at TIMESTAMP,
    files_changed INTEGER DEFAULT 0,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pull Requests table
CREATE TABLE IF NOT EXISTS pull_requests (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    repo_name VARCHAR(255) NOT NULL,
    pr_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    state VARCHAR(20) NOT NULL, -- open, closed, merged
    created_at TIMESTAMP NOT NULL,
    merged_at TIMESTAMP,
    closed_at TIMESTAMP,
    first_commit_at TIMESTAMP,
    base_branch VARCHAR(255),
    head_branch VARCHAR(255),
    commits_count INTEGER DEFAULT 0,
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    UNIQUE(repo_name, pr_number)
);

-- DORA Metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS dora_metrics (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    deployment_frequency DECIMAL(10, 2), -- deployments per day
    deployment_count INTEGER DEFAULT 0,
    lead_time_avg_hours DECIMAL(10, 2), -- average lead time in hours
    lead_time_median_hours DECIMAL(10, 2),
    change_failure_rate DECIMAL(5, 2), -- percentage
    mttr_hours DECIMAL(10, 2), -- mean time to recovery
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deployments_team_date ON deployments(team_id, deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_repo ON deployments(repo_name);
CREATE INDEX IF NOT EXISTS idx_commits_team_date ON commits(team_id, committed_at DESC);
CREATE INDEX IF NOT EXISTS idx_commits_repo ON commits(repo_name);
CREATE INDEX IF NOT EXISTS idx_commits_sha ON commits(sha);
CREATE INDEX IF NOT EXISTS idx_pr_team_date ON pull_requests(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pr_repo ON pull_requests(repo_name);
CREATE INDEX IF NOT EXISTS idx_dora_metrics_team_date ON dora_metrics(team_id, date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dora_metrics_updated_at BEFORE UPDATE ON dora_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
