import { Octokit } from '@octokit/rest';
import pool from '../database/connection';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export class GitHubService {
  /**
   * Fetch commits from a repository
   */
  async fetchCommits(owner: string, repo: string, since?: Date): Promise<void> {
    try {
      const sinceDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const { data: commits } = await octokit.repos.listCommits({
        owner,
        repo,
        since: sinceDate.toISOString(),
        per_page: 100,
      });

      for (const commit of commits) {
        await this.saveCommit(repo, commit);
      }

      console.log(`Fetched ${commits.length} commits from ${owner}/${repo}`);
    } catch (error) {
      console.error(`Error fetching commits from ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Fetch pull requests from a repository
   */
  async fetchPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all'): Promise<void> {
    try {
      const { data: prs } = await octokit.pulls.list({
        owner,
        repo,
        state,
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      });

      for (const pr of prs) {
        await this.savePullRequest(owner, repo, pr);
      }

      console.log(`Fetched ${prs.length} pull requests from ${owner}/${repo}`);
    } catch (error) {
      console.error(`Error fetching PRs from ${owner}/${repo}:`, error);
      throw error;
    }
  }

  /**
   * Get commit details including associated PR
   */
  private async saveCommit(repoName: string, commit: any): Promise<void> {
    try {
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

      // Check if commit has associated PR
      const prMatch = commit.commit.message.match(/#(\d+)/);
      const prNumber = prMatch ? parseInt(prMatch[1]) : null;

      await pool.query(
        `INSERT INTO commits (
          team_id, repo_name, sha, author, message, committed_at, pr_number
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (sha) DO UPDATE SET
          message = EXCLUDED.message,
          pr_number = EXCLUDED.pr_number`,
        [
          teamId,
          repoName,
          commit.sha,
          commit.commit.author.name || 'Unknown',
          commit.commit.message,
          new Date(commit.commit.author.date),
          prNumber,
        ]
      );
    } catch (error) {
      console.error('Error saving commit:', error);
    }
  }

  /**
   * Save pull request data
   */
  private async savePullRequest(owner: string, repoName: string, pr: any): Promise<void> {
    try {
      // Find team for this repo
      const teamResult = await pool.query(
        'SELECT id FROM teams WHERE $1 = ANY(github_repos) LIMIT 1',
        [repoName]
      );

      if (teamResult.rows.length === 0) {
        console.warn(`No team found for repo: ${repoName}`);
        return;
      }

      const teamId = teamResult.rows[0].id as number;

// helper
const toDateOrNull = (v?: string | number | Date | null) =>
  v == null ? null : new Date(v);

// Get first commit time from PR (author date → fallback to committer date)
let firstCommitAt: Date | null = null;
try {
  const { data: commits } = await octokit.pulls.listCommits({
    owner,
    repo: repoName,
    pull_number: pr.number,
    per_page: 1,
    page: 1,
  });

  const c0 = commits?.[0];
  const firstCommitDateStr =
    c0?.commit?.author?.date ?? c0?.commit?.committer?.date ?? null;

  firstCommitAt = toDateOrNull(firstCommitDateStr);
} catch (error) {
  console.error(`Error fetching PR commits for #${pr.number}:`, error);
}

// Safely coerce PR fields
const createdAt = toDateOrNull(pr?.created_at);
const mergedAt  = toDateOrNull(pr?.merged_at ?? null);
const closedAt  = toDateOrNull(pr?.closed_at ?? null);

const title       = pr?.title ?? "";
const authorLogin = pr?.user?.login ?? "unknown";
const baseRef     = pr?.base?.ref ?? null;
const headRef     = pr?.head?.ref ?? null;
const commitsCnt  = typeof pr?.commits === "number" ? pr.commits : 0;
const state       = pr?.merged_at ? "merged" : (pr?.state ?? "open");

await pool.query(
  `INSERT INTO pull_requests (
     team_id, repo_name, pr_number, title, author, state,
     created_at, merged_at, closed_at, first_commit_at,
     base_branch, head_branch, commits_count
   ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
   ON CONFLICT (repo_name, pr_number) DO UPDATE SET
     state = EXCLUDED.state,
     merged_at = EXCLUDED.merged_at,
     closed_at = EXCLUDED.closed_at,
     first_commit_at = EXCLUDED.first_commit_at`,
  [
    teamId,
    repoName,
    pr.number,
    title,
    authorLogin,
    state,
    createdAt,
    mergedAt,
    closedAt,
    firstCommitAt,
    baseRef,
    headRef,
    commitsCnt,
  ],
);


      // Update commits with PR information
      if (pr.merged_at) {
        await pool.query(
          `UPDATE commits SET
            pr_created_at = $1,
            pr_merged_at = $2
           WHERE pr_number = $3 AND repo_name = $4`,
          [
            new Date(pr.created_at),
            new Date(pr.merged_at),
            pr.number,
            repoName,
          ]
        );
      }
    } catch (error) {
      console.error('Error saving pull request:', error);
    }
  }

  /**
   * Sync all repositories for a team
   */
  async syncRepositories(teamId: number): Promise<void> {
    try {
      const result = await pool.query(
        'SELECT github_repos FROM teams WHERE id = $1',
        [teamId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Team ${teamId} not found`);
      }

      const repos = result.rows[0].github_repos;
      const owner = process.env.GITHUB_ORG || '';

      for (const repo of repos) {
        console.log(`Syncing ${owner}/${repo}...`);
        await this.fetchCommits(owner, repo);
        await this.fetchPullRequests(owner, repo);
      }

      console.log('GitHub sync completed');
    } catch (error) {
      console.error('Error syncing repositories:', error);
      throw error;
    }
  }
}

export default new GitHubService();
