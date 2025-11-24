"use client"

import React from 'react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

interface KPIRow {
  metric: string;
  spec: string;
  result: string;
  passed: boolean;
}

interface TestbenchViewProps {
  kpis?: KPIRow[];
  waveformData?: {
    max: string;
    min: string;
    freq: string;
    rms: string;
  };
}

const TestbenchView: React.FC<TestbenchViewProps> = ({ kpis, waveformData }) => {
  const defaultKPIs: KPIRow[] = kpis || [
    { metric: 'Vref_nom', spec: '1.225 ±1%', result: '1.227', passed: true },
    { metric: 'Tempco', spec: '≤20 ppm/°C', result: '16', passed: true },
    { metric: 'Line Regulation', spec: '≤1.5 mV/V', result: '0.8', passed: true },
    { metric: 'PSRR @100kHz', spec: '≥60 dB', result: '64', passed: true },
    { metric: 'Startup', spec: '≤100 µs', result: '65', passed: true },
    { metric: 'IQ @3.3V', spec: '≤100 µA', result: '49', passed: true }
  ];

  const defaultWaveform = waveformData || {
    max: '6.67 mA',
    min: '-6.67 mA',
    freq: '1 kHz',
    rms: '4.71 mA'
  };

  return (
    <div className="space-y-6">
      {/* KPI Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Key Performance Indicators</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700">Metric</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700">Spec</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-700">Result</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {defaultKPIs.map((kpi, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{kpi.metric}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{kpi.spec}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-900 font-medium">{kpi.result}</td>
                  <td className="px-4 py-2.5 text-center">
                    {kpi.passed && (
                      <CheckCircle2 size={16} className="text-green-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Waveform Graph */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Simulation Results</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {/* Simplified waveform visualization */}
          <div className="h-48 bg-gray-50 rounded border border-gray-200 relative overflow-hidden">
            <svg width="100%" height="100%" className="absolute inset-0">
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={`${y}%`}
                  x2="100%"
                  y2={`${y}%`}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}
              {/* Waveform */}
              <path
                d="M 0,50 Q 12.5,30 25,50 T 50,50 T 75,50 T 100,50"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                className="animate-pulse"
              />
              <path
                d="M 0,50 Q 12.5,30 25,50 T 50,50 T 75,50 T 100,50 L 100,100 L 0,100 Z"
                fill="url(#waveGradient)"
              />
            </svg>
            {/* Y-axis labels */}
            <div className="absolute left-2 top-2 text-xs text-gray-500">1V</div>
            <div className="absolute left-2 bottom-2 text-xs text-gray-500">0V</div>
            <div className="absolute right-2 top-2 text-xs text-gray-500">5 mA</div>
            <div className="absolute right-2 bottom-2 text-xs text-gray-500">-5 mA</div>
          </div>
          
          {/* Waveform metrics */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span><span className="font-medium">Max:</span> {defaultWaveform.max}</span>
              <span><span className="font-medium">Min:</span> {defaultWaveform.min}</span>
              <span><span className="font-medium">Freq:</span> {defaultWaveform.freq}</span>
              <span><span className="font-medium">RMS:</span> {defaultWaveform.rms}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3 pt-4">
        <button className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
          <ArrowLeft size={16} className="mr-2" />
          Back
        </button>
        <button className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors">
          Finalize Design
        </button>
        <button className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-md hover:bg-red-100 transition-colors">
          Make Adjustments
        </button>
      </div>
    </div>
  );
};

export default TestbenchView;






