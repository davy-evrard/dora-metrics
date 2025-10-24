import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartDataPoint } from '../types';

interface LeadTimeChartProps {
  data: ChartDataPoint[];
}

const LeadTimeChart: React.FC<LeadTimeChartProps> = ({ data }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    average: d.avg || 0,
    median: d.median || 0,
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Lead Time for Changes (Hours)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="average"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Average"
          />
          <Line
            type="monotone"
            dataKey="median"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Median"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LeadTimeChart;
