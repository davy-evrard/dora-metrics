import { Router } from 'express';
import metricsService from '../services/metrics.service';

const router = Router();

// Get metrics summary for a team
router.get('/summary/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const days = parseInt(req.query.days as string) || 30;

    const summary = await metricsService.getMetricsSummary(teamId, days);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching metrics summary:', error);
    res.status(500).json({ error: 'Failed to fetch metrics summary' });
  }
});

// Get historical metrics for a team
router.get('/historical/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const days = parseInt(req.query.days as string) || 30;

    const metrics = await metricsService.getHistoricalMetrics(teamId, days);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching historical metrics:', error);
    res.status(500).json({ error: 'Failed to fetch historical metrics' });
  }
});

// Trigger metrics calculation
router.post('/calculate/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const days = parseInt(req.body.days) || 30;

    await metricsService.recalculateMetrics(teamId, days);
    res.json({ message: 'Metrics calculation started' });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: 'Failed to calculate metrics' });
  }
});

// Get deployment frequency chart data
router.get('/chart/deployment-frequency/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const days = parseInt(req.query.days as string) || 30;

    const metrics = await metricsService.getHistoricalMetrics(teamId, days);

    const chartData = metrics.map((m) => ({
      date: m.date,
      value: m.deployment_frequency,
      count: m.deployment_count,
    }));

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching deployment frequency chart:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Get lead time chart data
router.get('/chart/lead-time/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const days = parseInt(req.query.days as string) || 30;

    const metrics = await metricsService.getHistoricalMetrics(teamId, days);

    const chartData = metrics.map((m) => ({
      date: m.date,
      avg: m.lead_time_avg_hours,
      median: m.lead_time_median_hours,
    }));

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching lead time chart:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// Get change failure rate chart data
router.get('/chart/change-failure-rate/:teamId', async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const days = parseInt(req.query.days as string) || 30;

    const metrics = await metricsService.getHistoricalMetrics(teamId, days);

    const chartData = metrics.map((m) => ({
      date: m.date,
      rate: m.change_failure_rate,
    }));

    res.json(chartData);
  } catch (error) {
    console.error('Error fetching change failure rate chart:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

export default router;
