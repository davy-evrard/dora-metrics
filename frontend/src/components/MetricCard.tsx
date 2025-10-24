import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  unit?: string;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  unit,
  description,
}) => {
  const getTrendColor = (trend: number) => {
    if (trend > 0) return '#10b981'; // green
    if (trend < 0) return '#ef4444'; // red
    return '#6b7280'; // gray
  };

  const formatTrend = (trend: number) => {
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  return (
    <div className="metric-card">
      <h3 className="metric-title">{title}</h3>
      <div className="metric-value">
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
      {trend !== undefined && (
        <div className="metric-trend" style={{ color: getTrendColor(trend) }}>
          {formatTrend(trend)} vs previous period
        </div>
      )}
      {description && <div className="metric-description">{description}</div>}
    </div>
  );
};

export default MetricCard;
