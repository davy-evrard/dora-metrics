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

interface ChangeFailureRateChartProps {
  data: ChartDataPoint[];
}

const ChangeFailureRateChart: React.FC<ChangeFailureRateChartProps> = ({ data }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const chartData = data.map((d) => ({
    date: formatDate(d.date),
    failureRate: d.rate || 0,
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Change Failure Rate (%)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="failureRate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4 }}
            name="Failure Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChangeFailureRateChart;
