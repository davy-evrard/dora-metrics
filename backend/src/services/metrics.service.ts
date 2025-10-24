import pool from '../database/connection';
import { DoraMetrics, MetricsSummary } from '../types';

export class MetricsService {
  /**
   * Calculate DORA metrics for a specific date and team
   */
  async calculateDailyMetrics(teamId: number, date: Date): Promise<void> {
    try {
      const dateStr = date.toISOString().split('T')[0];

      // Calculate deployment frequency (deployments per day)
      const deploymentResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM deployments
         WHERE team_id = $1
           AND DATE(deployed_at) = $2
           AND status = 'success'`,
        [teamId, dateStr]
      );
      const deploymentCount = parseInt(deploymentResult.rows[0].count);
      const deploymentFrequency = deploymentCount;

      // Calculate lead time (time from first commit to deployment)
      const leadTimeResult = await pool.query(
        `SELECT
           AVG(EXTRACT(EPOCH FROM (d.deployed_at - pr.first_commit_at)) / 3600) as avg_hours,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (d.deployed_at - pr.first_commit_at)) / 3600) as median_hours
         FROM deployments d
         JOIN commits c ON c.sha = d.commit_sha AND c.repo_name = d.repo_name
         LEFT JOIN pull_requests pr ON pr.pr_number = c.pr_number AND pr.repo_name = c.repo_name
         WHERE d.team_id = $1
           AND DATE(d.deployed_at) = $2
           AND d.status = 'success'
           AND pr.first_commit_at IS NOT NULL`,
        [teamId, dateStr]
      );

      const leadTimeAvg = parseFloat(leadTimeResult.rows[0]?.avg_hours || '0');
      const leadTimeMedian = parseFloat(leadTimeResult.rows[0]?.median_hours || '0');

      // Calculate change failure rate
      const failureResult = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
           COUNT(*) as total_count
         FROM deployments
         WHERE team_id = $1
           AND DATE(deployed_at) = $2`,
        [teamId, dateStr]
      );

      const failedCount = parseInt(failureResult.rows[0].failed_count);
      const totalCount = parseInt(failureResult.rows[0].total_count);
      const changeFailureRate = totalCount > 0 ? (failedCount / totalCount) * 100 : 0;

      // Calculate MTTR (mean time to recovery)
      // This is simplified - in real world, you'd track incidents and recovery times
      const mttrResult = await pool.query(
        `SELECT AVG(duration_seconds) / 3600 as avg_hours
         FROM deployments
         WHERE team_id = $1
           AND DATE(deployed_at) = $2
           AND status = 'success'
           AND duration_seconds IS NOT NULL`,
        [teamId, dateStr]
      );

      const mttrHours = parseFloat(mttrResult.rows[0]?.avg_hours || '0');

      // Save metrics
      await pool.query(
        `INSERT INTO dora_metrics (
          team_id, date, deployment_frequency, deployment_count,
          lead_time_avg_hours, lead_time_median_hours,
          change_failure_rate, mttr_hours
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (team_id, date) DO UPDATE SET
          deployment_frequency = EXCLUDED.deployment_frequency,
          deployment_count = EXCLUDED.deployment_count,
          lead_time_avg_hours = EXCLUDED.lead_time_avg_hours,
          lead_time_median_hours = EXCLUDED.lead_time_median_hours,
          change_failure_rate = EXCLUDED.change_failure_rate,
          mttr_hours = EXCLUDED.mttr_hours,
          updated_at = CURRENT_TIMESTAMP`,
        [
          teamId,
          dateStr,
          deploymentFrequency,
          deploymentCount,
          leadTimeAvg,
          leadTimeMedian,
          changeFailureRate,
          mttrHours,
        ]
      );

      console.log(`Calculated metrics for team ${teamId} on ${dateStr}`);
    } catch (error) {
      console.error('Error calculating daily metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics for a date range
   */
  async calculateMetricsRange(teamId: number, startDate: Date, endDate: Date): Promise<void> {
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      await this.calculateDailyMetrics(teamId, new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Calculated metrics for team ${teamId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  }

  /**
   * Get metrics summary for a period
   */
  async getMetricsSummary(teamId: number, days: number = 30, repos?: string[]): Promise<MetricsSummary> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);

      // Get team info
      const teamResult = await pool.query(
        'SELECT name FROM teams WHERE id = $1',
        [teamId]
      );

      if (teamResult.rows.length === 0) {
        throw new Error(`Team ${teamId} not found`);
      }

      const teamName = teamResult.rows[0].name;

      // Optional: per-repo filtering. If repos provided, compute from base tables.
      if (repos && repos.length > 0) {
        return await this.getMetricsSummaryForRepos(teamId, days, repos, teamName);
      }

      // Get current period metrics
      const metricsResult = await pool.query(
        `SELECT
           AVG(deployment_frequency) as avg_deployment_frequency,
           SUM(deployment_count) as total_deployments,
           AVG(lead_time_avg_hours) as avg_lead_time,
           AVG(lead_time_median_hours) as median_lead_time,
           AVG(change_failure_rate) as avg_change_failure_rate,
           AVG(mttr_hours) as avg_mttr
         FROM dora_metrics
         WHERE team_id = $1
           AND date >= $2
           AND date <= $3`,
        [teamId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      const currentMetrics = metricsResult.rows[0];

      // Get previous period metrics for trend calculation
      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - days);
      const prevEndDate = new Date(startDate);

      const prevMetricsResult = await pool.query(
        `SELECT
           AVG(deployment_frequency) as avg_deployment_frequency,
           AVG(lead_time_avg_hours) as avg_lead_time,
           AVG(change_failure_rate) as avg_change_failure_rate
         FROM dora_metrics
         WHERE team_id = $1
           AND date >= $2
           AND date < $3`,
        [teamId, prevStartDate.toISOString().split('T')[0], prevEndDate.toISOString().split('T')[0]]
      );

      const prevMetrics = prevMetricsResult.rows[0];

      // Calculate trends (percentage change)
      const calcTrend = (current: number, previous: number): number => {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        team_id: teamId,
        team_name: teamName,
        period: `${days}d`,
        deployment_frequency: parseFloat(currentMetrics.avg_deployment_frequency || '0'),
        deployment_count: parseInt(currentMetrics.total_deployments || '0'),
        lead_time_avg_hours: parseFloat(currentMetrics.avg_lead_time || '0'),
        lead_time_median_hours: parseFloat(currentMetrics.median_lead_time || '0'),
        change_failure_rate: parseFloat(currentMetrics.avg_change_failure_rate || '0'),
        mttr_hours: parseFloat(currentMetrics.avg_mttr || '0'),
        trend: {
          deployment_frequency: calcTrend(
            parseFloat(currentMetrics.avg_deployment_frequency || '0'),
            parseFloat(prevMetrics?.avg_deployment_frequency || '0')
          ),
          lead_time: calcTrend(
            parseFloat(currentMetrics.avg_lead_time || '0'),
            parseFloat(prevMetrics?.avg_lead_time || '0')
          ),
          change_failure_rate: calcTrend(
            parseFloat(currentMetrics.avg_change_failure_rate || '0'),
            parseFloat(prevMetrics?.avg_change_failure_rate || '0')
          ),
        },
      };
    } catch (error) {
      console.error('Error getting metrics summary:', error);
      throw error;
    }
  }

  /**
   * Get historical metrics data
   */
  async getHistoricalMetrics(teamId: number, days: number = 30, repos?: string[]): Promise<DoraMetrics[]> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - days);

      if (repos && repos.length > 0) {
        // Compute per-day metrics from base tables when filtering repos
        // @ts-ignore return compatible shape
        return await this.getHistoricalForRepos(teamId, days, repos);
      }

      const result = await pool.query(
        `SELECT * FROM dora_metrics
         WHERE team_id = $1
           AND date >= $2
           AND date <= $3
         ORDER BY date ASC`,
        [teamId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting historical metrics:', error);
      throw error;
    }
  }

  /**
   * Recalculate all metrics for the last N days
   */
  async recalculateMetrics(teamId: number, days: number = 30): Promise<void> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);

    await this.calculateMetricsRange(teamId, startDate, endDate);
    console.log(`Recalculated ${days} days of metrics for team ${teamId}`);
  }

  // Compute summary using base tables for a subset of repositories
  private async getMetricsSummaryForRepos(
    teamId: number,
    days: number,
    repos: string[],
    teamName: string
  ): Promise<MetricsSummary> {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Deployments aggregation
    const depAgg = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'success') AS success_count,
         COUNT(*) AS total_count
       FROM deployments
       WHERE team_id = $1 AND repo_name = ANY($2)
         AND DATE(deployed_at) BETWEEN $3 AND $4`,
      [teamId, repos, startStr, endStr]
    );
    const successCount = parseInt(depAgg.rows[0]?.success_count || '0');
    const totalCount = parseInt(depAgg.rows[0]?.total_count || '0');
    const deploymentFrequency = days > 0 ? successCount / days : 0;

    // Lead time aggregation
    const ltAgg = await pool.query(
      `SELECT
         AVG(EXTRACT(EPOCH FROM (d.deployed_at - pr.first_commit_at)) / 3600) AS avg_hours,
         PERCENTILE_CONT(0.5) WITHIN GROUP (
           ORDER BY EXTRACT(EPOCH FROM (d.deployed_at - pr.first_commit_at)) / 3600
         ) AS median_hours
       FROM deployments d
       JOIN commits c ON c.sha = d.commit_sha AND c.repo_name = d.repo_name
       LEFT JOIN pull_requests pr ON pr.pr_number = c.pr_number AND pr.repo_name = c.repo_name
       WHERE d.team_id = $1 AND d.repo_name = ANY($2)
         AND d.status = 'success' AND pr.first_commit_at IS NOT NULL
         AND DATE(d.deployed_at) BETWEEN $3 AND $4`,
      [teamId, repos, startStr, endStr]
    );
    const leadTimeAvg = parseFloat(ltAgg.rows[0]?.avg_hours || '0');
    const leadTimeMedian = parseFloat(ltAgg.rows[0]?.median_hours || '0');

    // Change failure rate
    const failedAgg = await pool.query(
      `SELECT COUNT(*) AS failed
         FROM deployments
        WHERE team_id = $1 AND repo_name = ANY($2)
          AND status = 'failed'
          AND DATE(deployed_at) BETWEEN $3 AND $4`,
      [teamId, repos, startStr, endStr]
    );
    const failedCount = parseInt(failedAgg.rows[0]?.failed || '0');
    const changeFailureRate = totalCount > 0 ? (failedCount / totalCount) * 100 : 0;

    // MTTR
    const mttrAgg = await pool.query(
      `SELECT AVG(duration_seconds) / 3600 AS avg_hours
         FROM deployments
        WHERE team_id = $1 AND repo_name = ANY($2)
          AND status = 'success' AND duration_seconds IS NOT NULL
          AND DATE(deployed_at) BETWEEN $3 AND $4`,
      [teamId, repos, startStr, endStr]
    );
    const mttrHours = parseFloat(mttrAgg.rows[0]?.avg_hours || '0');

    // Previous period for trends
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    const prevStartStr = prevStartDate.toISOString().split('T')[0];
    const prevEndStr = prevEndDate.toISOString().split('T')[0];

    const prevDepAgg = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'success') AS success_count,
              COUNT(*) AS total_count
         FROM deployments
        WHERE team_id = $1 AND repo_name = ANY($2)
          AND DATE(deployed_at) >= $3 AND DATE(deployed_at) < $4`,
      [teamId, repos, prevStartStr, prevEndStr]
    );
    const prevSuccess = parseInt(prevDepAgg.rows[0]?.success_count || '0');
    const prevTotal = parseInt(prevDepAgg.rows[0]?.total_count || '0');
    const prevDeploymentFrequency = days > 0 ? prevSuccess / days : 0;

    const prevLtAgg = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (d.deployed_at - pr.first_commit_at)) / 3600) AS avg_hours
         FROM deployments d
         JOIN commits c ON c.sha = d.commit_sha AND c.repo_name = d.repo_name
         LEFT JOIN pull_requests pr ON pr.pr_number = c.pr_number AND pr.repo_name = c.repo_name
        WHERE d.team_id = $1 AND d.repo_name = ANY($2)
          AND d.status = 'success' AND pr.first_commit_at IS NOT NULL
          AND DATE(d.deployed_at) >= $3 AND DATE(d.deployed_at) < $4`,
      [teamId, repos, prevStartStr, prevEndStr]
    );
    const prevLeadTimeAvg = parseFloat(prevLtAgg.rows[0]?.avg_hours || '0');

    const prevFailedAgg = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'failed') AS failed,
              COUNT(*) AS total
         FROM deployments
        WHERE team_id = $1 AND repo_name = ANY($2)
          AND DATE(deployed_at) >= $3 AND DATE(deployed_at) < $4`,
      [teamId, repos, prevStartStr, prevEndStr]
    );
    const prevFailed = parseInt(prevFailedAgg.rows[0]?.failed || '0');
    const prevTotalAll = parseInt(prevFailedAgg.rows[0]?.total || '0');
    const prevChangeFailureRate = prevTotalAll > 0 ? (prevFailed / prevTotalAll) * 100 : 0;

    const trend = (current: number, previous: number) => {
      if (!previous || previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      team_id: teamId,
      team_name: teamName,
      period: `${days}d`,
      deployment_frequency: deploymentFrequency,
      deployment_count: successCount,
      lead_time_avg_hours: leadTimeAvg,
      lead_time_median_hours: leadTimeMedian,
      change_failure_rate: changeFailureRate,
      mttr_hours: mttrHours,
      trend: {
        deployment_frequency: trend(deploymentFrequency, prevDeploymentFrequency),
        lead_time: trend(leadTimeAvg, prevLeadTimeAvg),
        change_failure_rate: trend(changeFailureRate, prevChangeFailureRate),
      },
    };
  }

  // Compute historical (daily) metrics using base tables with repo filter
  private async getHistoricalForRepos(teamId: number, days: number, repos: string[]) {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const dayMap: Record<string, any> = {};
    const ensureDay = (d: string) => {
      if (!dayMap[d]) {
        dayMap[d] = {
          team_id: teamId,
          date: d,
          deployment_frequency: 0,
          deployment_count: 0,
          lead_time_avg_hours: 0,
          lead_time_median_hours: 0,
          change_failure_rate: 0,
          mttr_hours: 0,
        };
      }
      return dayMap[d];
    };

    const depByDay = await pool.query(
      `SELECT DATE(deployed_at) AS date,
              COUNT(*) FILTER (WHERE status = 'success') AS success_count,
              COUNT(*) AS total_count
         FROM deployments
        WHERE team_id = $1 AND repo_name = ANY($2)
          AND DATE(deployed_at) BETWEEN $3 AND $4
        GROUP BY DATE(deployed_at)
        ORDER BY DATE(deployed_at)`,
      [teamId, repos, startStr, endStr]
    );
    for (const row of depByDay.rows) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      const rec = ensureDay(dateStr);
      const success = parseInt(row.success_count || '0');
      const total = parseInt(row.total_count || '0');
      rec.deployment_count = success;
      rec.deployment_frequency = success;
      rec.change_failure_rate = total > 0 ? ((total - success) / total) * 100 : rec.change_failure_rate;
    }

    const ltByDay = await pool.query(
      `SELECT DATE(d.deployed_at) AS date,
              AVG(EXTRACT(EPOCH FROM (d.deployed_at - pr.first_commit_at)) / 3600) AS avg_hours,
              PERCENTILE_CONT(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (d.deployed_at - pr.first_commit_at)) / 3600
              ) AS median_hours
         FROM deployments d
         JOIN commits c ON c.sha = d.commit_sha AND c.repo_name = d.repo_name
         LEFT JOIN pull_requests pr ON pr.pr_number = c.pr_number AND pr.repo_name = c.repo_name
        WHERE d.team_id = $1 AND d.repo_name = ANY($2)
          AND d.status = 'success' AND pr.first_commit_at IS NOT NULL
          AND DATE(d.deployed_at) BETWEEN $3 AND $4
        GROUP BY DATE(d.deployed_at)
        ORDER BY DATE(d.deployed_at)`,
      [teamId, repos, startStr, endStr]
    );
    for (const row of ltByDay.rows) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      const rec = ensureDay(dateStr);
      rec.lead_time_avg_hours = parseFloat(row.avg_hours || '0');
      rec.lead_time_median_hours = parseFloat(row.median_hours || '0');
    }

    const mttrByDay = await pool.query(
      `SELECT DATE(deployed_at) AS date,
              AVG(duration_seconds) / 3600 AS avg_hours
         FROM deployments
        WHERE team_id = $1 AND repo_name = ANY($2)
          AND status = 'success' AND duration_seconds IS NOT NULL
          AND DATE(deployed_at) BETWEEN $3 AND $4
        GROUP BY DATE(deployed_at)
        ORDER BY DATE(deployed_at)`,
      [teamId, repos, startStr, endStr]
    );
    for (const row of mttrByDay.rows) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      const rec = ensureDay(dateStr);
      rec.mttr_hours = parseFloat(row.avg_hours || '0');
    }

    const dates = Object.keys(dayMap).sort();
    return dates.map((d) => dayMap[d]);
  }
}

export default new MetricsService();
