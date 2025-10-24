import axios from 'axios';
import { Team, MetricsSummary, HistoricalMetric, ChartDataPoint } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Teams API
export const teamsAPI = {
  getAll: () => api.get<Team[]>('/api/teams'),
  getById: (id: number) => api.get<Team>(`/api/teams/${id}`),
  create: (team: Partial<Team>) => api.post<Team>('/api/teams', team),
  update: (id: number, team: Partial<Team>) => api.put<Team>(`/api/teams/${id}`, team),
  delete: (id: number) => api.delete(`/api/teams/${id}`),
};

// Metrics API
export const metricsAPI = {
  getSummary: (teamId: number, days: number = 30, repo?: string) =>
    api.get<MetricsSummary>(`/api/metrics/summary/${teamId}`, { params: { days, ...(repo ? { repo } : {}) } }),
  getHistorical: (teamId: number, days: number = 30, repo?: string) =>
    api.get<HistoricalMetric[]>(`/api/metrics/historical/${teamId}`, { params: { days, ...(repo ? { repo } : {}) } }),
  calculate: (teamId: number, days: number = 30) =>
    api.post(`/api/metrics/calculate/${teamId}`, { days }),
  getDeploymentFrequencyChart: (teamId: number, days: number = 30, repo?: string) =>
    api.get<ChartDataPoint[]>(`/api/metrics/chart/deployment-frequency/${teamId}`, { params: { days, ...(repo ? { repo } : {}) } }),
  getLeadTimeChart: (teamId: number, days: number = 30, repo?: string) =>
    api.get<ChartDataPoint[]>(`/api/metrics/chart/lead-time/${teamId}`, { params: { days, ...(repo ? { repo } : {}) } }),
  getChangeFailureRateChart: (teamId: number, days: number = 30, repo?: string) =>
    api.get<ChartDataPoint[]>(`/api/metrics/chart/change-failure-rate/${teamId}`, { params: { days, ...(repo ? { repo } : {}) } }),
};

// Sync API
export const syncAPI = {
  syncGitHub: (teamId: number) => api.post(`/api/sync/github/${teamId}`),
  syncCircleCI: (teamId: number) => api.post(`/api/sync/circleci/${teamId}`),
  syncAll: (teamId: number) => api.post(`/api/sync/all/${teamId}`),
};

export default api;
