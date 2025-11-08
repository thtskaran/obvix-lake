import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { KPIMetric } from '../../types';

interface KPIStatProps {
  metric: KPIMetric;
  className?: string;
}

export const KPIStat = ({ metric, className }: KPIStatProps) => {
  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className={`bg-white p-6 rounded-lg border border-gray-200 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{metric.label}</p>
          <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
        </div>
        {metric.trend && (
          <div className="flex items-center">
            {getTrendIcon()}
          </div>
        )}
      </div>
    </div>
  );
};