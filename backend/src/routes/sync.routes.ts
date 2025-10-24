import { Router } from 'express';
import githubService from '../services/github.service';
import circleCIService from '../services/circleci.service';
import metricsService from '../services/metrics.service';

const router = Router();

// Sync GitHub data for a team
router.post('/github/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);

    // Run sync in background
    githubService.syncRepositories(teamId)
      .then(() => {
        console.log(`GitHub sync completed for team ${teamId}`);
        // Recalculate metrics after sync
        return metricsService.recalculateMetrics(teamId, 30);
      })
      .catch((error) => {
        console.error('Error in GitHub sync:', error);
      });

    res.json({ message: 'GitHub sync started' });
  } catch (error) {
    console.error('Error starting GitHub sync:', error);
    res.status(500).json({ error: 'Failed to start GitHub sync' });
  }
});

// Sync CircleCI data for a team
router.post('/circleci/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);

    // Run sync in background
    circleCIService.syncProjects(teamId)
      .then(() => {
        console.log(`CircleCI sync completed for team ${teamId}`);
        // Recalculate metrics after sync
        return metricsService.recalculateMetrics(teamId, 30);
      })
      .catch((error) => {
        console.error('Error in CircleCI sync:', error);
      });

    res.json({ message: 'CircleCI sync started' });
  } catch (error) {
    console.error('Error starting CircleCI sync:', error);
    res.status(500).json({ error: 'Failed to start CircleCI sync' });
  }
});

// Sync all data sources for a team
router.post('/all/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);

    // Run all syncs in parallel
    Promise.all([
      githubService.syncRepositories(teamId),
      circleCIService.syncProjects(teamId),
    ])
      .then(() => {
        console.log(`All syncs completed for team ${teamId}`);
        // Recalculate metrics after all syncs
        return metricsService.recalculateMetrics(teamId, 30);
      })
      .catch((error) => {
        console.error('Error in sync process:', error);
      });

    res.json({ message: 'Full sync started' });
  } catch (error) {
    console.error('Error starting full sync:', error);
    res.status(500).json({ error: 'Failed to start full sync' });
  }
});

export default router;
