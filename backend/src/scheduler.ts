import cron from 'node-cron';
import pool from './database/connection';
import githubService from './services/github.service';
import circleCIService from './services/circleci.service';
import metricsService from './services/metrics.service';

export class Scheduler {
  private tasks: cron.ScheduledTask[] = [];

  /**
   * Start all scheduled tasks
   */
  start(): void {
    console.log('Starting scheduled tasks...');

    // Sync GitHub data every 5 minutes
    const githubTask = cron.schedule('*/5 * * * *', async () => {
      console.log('Running scheduled GitHub sync...');
      await this.syncAllTeamsGitHub();
    });
    this.tasks.push(githubTask);

    // Sync CircleCI data every 5 minutes
    const circleCITask = cron.schedule('*/5 * * * *', async () => {
      console.log('Running scheduled CircleCI sync...');
      await this.syncAllTeamsCircleCI();
    });
    this.tasks.push(circleCITask);

    // Calculate metrics every 10 minutes
    const metricsTask = cron.schedule('*/10 * * * *', async () => {
      console.log('Running scheduled metrics calculation...');
      await this.calculateAllTeamsMetrics();
    });
    this.tasks.push(metricsTask);

    // Calculate daily metrics at midnight
    const dailyMetricsTask = cron.schedule('0 0 * * *', async () => {
      console.log('Running daily metrics calculation...');
      await this.calculateAllTeamsMetrics();
    });
    this.tasks.push(dailyMetricsTask);

    console.log('Scheduled tasks started');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    console.log('Stopping scheduled tasks...');
    this.tasks.forEach((task) => task.stop());
    this.tasks = [];
  }

  /**
   * Sync GitHub data for all teams
   */
  private async syncAllTeamsGitHub(): Promise<void> {
    try {
      const result = await pool.query('SELECT id FROM teams');
      const teams = result.rows;

      for (const team of teams) {
        try {
          await githubService.syncRepositories(team.id);
        } catch (error) {
          console.error(`Error syncing GitHub for team ${team.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in syncAllTeamsGitHub:', error);
    }
  }

  /**
   * Sync CircleCI data for all teams
   */
  private async syncAllTeamsCircleCI(): Promise<void> {
    try {
      const result = await pool.query('SELECT id FROM teams');
      const teams = result.rows;

      for (const team of teams) {
        try {
          await circleCIService.syncProjects(team.id);
        } catch (error) {
          console.error(`Error syncing CircleCI for team ${team.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in syncAllTeamsCircleCI:', error);
    }
  }

  /**
   * Calculate metrics for all teams
   */
  private async calculateAllTeamsMetrics(): Promise<void> {
    try {
      const result = await pool.query('SELECT id FROM teams');
      const teams = result.rows;

      const today = new Date();

      for (const team of teams) {
        try {
          await metricsService.calculateDailyMetrics(team.id, today);
        } catch (error) {
          console.error(`Error calculating metrics for team ${team.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in calculateAllTeamsMetrics:', error);
    }
  }
}

export default new Scheduler();
