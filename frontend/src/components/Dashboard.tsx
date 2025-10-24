import React, { useEffect, useState } from 'react';
import { metricsAPI, syncAPI, teamsAPI } from '../services/api';
import { MetricsSummary, ChartDataPoint } from '../types';
import wsService from '../services/websocket';
import MetricCard from './MetricCard';
import DeploymentFrequencyChart from './DeploymentFrequencyChart';
import LeadTimeChart from './LeadTimeChart';
import ChangeFailureRateChart from './ChangeFailureRateChart';

interface DashboardProps {
  teamId: number;
  teamName: string;
}

const Dashboard: React.FC<DashboardProps> = ({ teamId, teamName }) => {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [deploymentChartData, setDeploymentChartData] = useState<ChartDataPoint[]>([]);
  const [leadTimeChartData, setLeadTimeChartData] = useState<ChartDataPoint[]>([]);
  const [failureRateChartData, setFailureRateChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [period, setPeriod] = useState(30);
  const [repos, setRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');

  useEffect(() => {
    // Load team repos when team changes
    (async () => {
      try {
        const t = await teamsAPI.getById(teamId);
        setRepos(t.data.github_repos || []);
        setSelectedRepo('');
      } catch (e) {
        console.error('Error loading team repos', e);
        setRepos([]);
        setSelectedRepo('');
      }
    })();
  }, [teamId]);

  useEffect(() => {
    loadData();
    setupWebSocket();
  }, [teamId, period, selectedRepo]);

  const loadData = async () => {
    try {
      setLoading(true);

      const repo = selectedRepo || undefined;
      const [summaryRes, deploymentRes, leadTimeRes, failureRateRes] = await Promise.all([
        metricsAPI.getSummary(teamId, period, repo),
        metricsAPI.getDeploymentFrequencyChart(teamId, period, repo),
        metricsAPI.getLeadTimeChart(teamId, period, repo),
        metricsAPI.getChangeFailureRateChart(teamId, period, repo),
      ]);

      setSummary(summaryRes.data);
      setDeploymentChartData(deploymentRes.data);
      setLeadTimeChartData(leadTimeRes.data);
      setFailureRateChartData(failureRateRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    wsService.connect();
    wsService.subscribe(teamId);

    const handleMetricsUpdate = (data: any) => {
      if (data.teamId === teamId && !selectedRepo) {
        setSummary(data.data);
      }
    };

    wsService.on('metrics_update', handleMetricsUpdate);

    return () => {
      wsService.off('metrics_update', handleMetricsUpdate);
    };
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncAPI.syncAll(teamId);
      setTimeout(() => {
        loadData();
      }, 5000); // Reload after 5 seconds to allow sync to complete
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading metrics...</div>;
  }

  if (!summary) {
    return <div className="error">No metrics data available</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>{teamName} - DORA Metrics</h1>
          <p className="dashboard-subtitle">
            DevOps Research and Assessment metrics for the last {period} days
          </p>
        </div>
        <div className="dashboard-actions">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="period-select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="repo-select"
          >
            <option value="">All repositories</option>
            {repos.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button onClick={handleSync} disabled={syncing} className="sync-button">
            {syncing ? 'Syncing...' : 'Sync Data'}
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="Deployment Frequency"
          value={summary.deployment_frequency}
          subtitle={`${summary.deployment_count} total deployments`}
          trend={summary.trend.deployment_frequency}
          unit=" per day"
          description="How often code is deployed to production"
        />
        <MetricCard
          title="Lead Time for Changes"
          value={summary.lead_time_avg_hours}
          subtitle={`Median: ${summary.lead_time_median_hours.toFixed(2)} hours`}
          trend={summary.trend.lead_time}
          unit=" hours"
          description="Time from commit to production deployment"
        />
        <MetricCard
          title="Change Failure Rate"
          value={summary.change_failure_rate}
          trend={summary.trend.change_failure_rate}
          unit="%"
          description="Percentage of deployments that fail"
        />
        <MetricCard
          title="Mean Time to Recovery"
          value={summary.mttr_hours}
          unit=" hours"
          description="Average time to recover from failures"
        />
      </div>

      <div className="charts-grid">
        <DeploymentFrequencyChart data={deploymentChartData} />
        <LeadTimeChart data={leadTimeChartData} />
        <ChangeFailureRateChart data={failureRateChartData} />
      </div>
    </div>
  );
};

export default Dashboard;
