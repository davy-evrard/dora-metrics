import axios from 'axios';
import pool from '../database/connection';

const CIRCLECI_API = 'https://circleci.com/api/v2';

export class CircleCIService {
  private token: string;
  private orgSlug: string;

  constructor() {
    this.token = process.env.CIRCLECI_TOKEN || '';
    this.orgSlug = process.env.CIRCLECI_ORG || '';
  }

  /**
   * Fetch recent pipelines for a project
   */
  async fetchPipelines(projectSlug: string, branch: string = 'main'): Promise<void> {
    try {
      const response = await axios.get(
        `${CIRCLECI_API}/project/${projectSlug}/pipeline`,
        {
          headers: {
            'Circle-Token': this.token,
          },
          params: {
            branch,
          },
        }
      );

      const pipelines = response.data.items;

      for (const pipeline of pipelines) {
        await this.fetchWorkflows(pipeline);
      }

      console.log(`Fetched ${pipelines.length} pipelines from ${projectSlug}`);
    } catch (error) {
      console.error(`Error fetching pipelines from ${projectSlug}:`, error);
      throw error;
    }
  }

  /**
   * Fetch workflows for a pipeline
   */
  private async fetchWorkflows(pipeline: any): Promise<void> {
    try {
      const response = await axios.get(
        `${CIRCLECI_API}/pipeline/${pipeline.id}/workflow`,
        {
          headers: {
            'Circle-Token': this.token,
          },
        }
      );

      const workflows = response.data.items;

      for (const workflow of workflows) {
        if (workflow.name.includes('deploy') || workflow.name.includes('release')) {
          await this.saveDeployment(pipeline, workflow);
        }
      }
    } catch (error) {
      console.error(`Error fetching workflows for pipeline ${pipeline.id}:`, error);
    }
  }

  /**
   * Save deployment data from workflow
   */
  private async saveDeployment(pipeline: any, workflow: any): Promise<void> {
    try {
      // Extract repo name from project slug (gh/org/repo -> repo)
      const repoName = pipeline.project_slug.split('/').pop();

      // Find team for this repo
      const teamResult = await pool.query(
        'SELECT id FROM teams WHERE $1 = ANY(github_repos) LIMIT 1',
        [repoName]
      );

      if (teamResult.rows.length === 0) {
        console.warn(`No team found for repo: ${repoName}`);
        return;
      }

      const teamId = teamResult.rows[0].id;

      // Determine status
      let status: 'success' | 'failed' | 'running' = 'running';
      if (workflow.status === 'success') status = 'success';
      else if (workflow.status === 'failed' || workflow.status === 'error') status = 'failed';

      // Calculate duration
      let duration = null;
      if (workflow.stopped_at && workflow.created_at) {
        duration = Math.floor(
          (new Date(workflow.stopped_at).getTime() - new Date(workflow.created_at).getTime()) / 1000
        );
      }

      await pool.query(
        `INSERT INTO deployments (
          team_id, repo_name, commit_sha, branch, environment, status,
          deployed_at, duration_seconds, circleci_workflow_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (repo_name, commit_sha, deployed_at) DO UPDATE SET
          status = EXCLUDED.status,
          duration_seconds = EXCLUDED.duration_seconds`,
        [
          teamId,
          repoName,
          pipeline.vcs.revision,
          pipeline.vcs.branch,
          this.extractEnvironment(workflow.name),
          status,
          new Date(workflow.created_at),
          duration,
          workflow.id,
        ]
      );
    } catch (error) {
      console.error('Error saving deployment:', error);
    }
  }

  /**
   * Extract environment from workflow name
   */
  private extractEnvironment(workflowName: string): string {
    const name = workflowName.toLowerCase();
    if (name.includes('production') || name.includes('prod')) return 'production';
    if (name.includes('staging')) return 'staging';
    if (name.includes('dev')) return 'development';
    return 'production';
  }

  /**
   * Sync all projects for a team
   */
  async syncProjects(teamId: number): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT github_repos FROM teams WHERE id = $1',
        [teamId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Team ${teamId} not found`);
      }

      const repos = result.rows[0].github_repos;

      for (const repo of repos) {
        const projectSlug = `gh/${this.orgSlug}/${repo}`;
        console.log(`Syncing CircleCI pipelines for ${projectSlug}...`);
        await this.fetchPipelines(projectSlug);
      }

      console.log('CircleCI sync completed');
    } catch (error) {
      console.error('Error syncing projects:', error);
      throw error;
    }
  }
}

export default new CircleCIService();
