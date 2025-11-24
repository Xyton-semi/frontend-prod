"use client"

import React from 'react';
import { CheckCircle2, FileCode } from 'lucide-react';

interface SchematicViewProps {
  designSpecs?: {
    title: string;
    requirements: string;
    specs: Array<{ label: string; value: string }>;
  };
  aiMessages?: Array<{
    id: string;
    text: string;
    type: 'message' | 'code' | 'success';
    code?: string;
  }>;
  behavioralSummary?: {
    architecture: string;
    nominalVref: string;
    tempco: string;
    supplyRange: string;
    quiescentCurrent: string;
    psrr: string;
    startup: string;
    loadStability: string;
    areaEstimate: string;
  };
}

const SchematicView: React.FC<SchematicViewProps> = ({
  designSpecs,
  aiMessages,
  behavioralSummary
}) => {
  // Default data for demonstration
  const defaultSpecs = designSpecs || {
    title: "Design a Bandgap reference for a DC-DC converter.",
    requirements: "Design a Bandgap reference for a DC-DC converter.",
    specs: [
      { label: "Vref", value: "1.225 V ±1% @ 27°C" },
      { label: "Tempco", value: "≤ 20 ppm/°C (-40..125°C)" },
      { label: "VDD", value: "3.0-3.6 V" },
      { label: "IQ", value: "≤ 100 μA" },
      { label: "PSRR", value: "≥ 60 dB @100 kHz" },
      { label: "Startup", value: "≤ 1 μs" },
      { label: "Area", value: "≤ 0.05 mm²" },
      { label: "Load", value: "100 KΩ || 10 nF" }
    ]
  };

  const defaultMessages = aiMessages || [
    {
      id: '1',
      text: "Acknowledged. Let's get started with a behavioral model to ensure specifications are captured correctly..",
      type: 'message' as const
    },
    {
      id: '2',
      text: "Behavioral Model Generated",
      type: 'code' as const,
      code: "bandgap_model.va\nVREF0 = 1.225\nTC = 20 ppm/°C\nPSRR = 60 dB\nIQ = 50 μA"
    },
    {
      id: '3',
      text: "Behavioral Model Generated",
      type: 'success' as const
    }
  ];

  const defaultSummary = behavioralSummary || {
    architecture: "Curvature-compensated CMOS bandgap (Brokaw-style) with PTAT + ΔVbe summation",
    nominalVref: "~1.225 V (within ±1%)",
    tempco: "≤ 20 ppm/°C (tunable)",
    supplyRange: "3.0-3.6 V (designed to maintain regulation and headroom)",
    quiescentCurrent: "= 50 μA (model default; target ≤ 100 μA)",
    psrr: "≥ 60 dB (via bias-tree decoupling + cascodes)",
    startup: "< 1 μs with assisted startup injector and auto-latch-off",
    loadStability: "Stable with 100 kΩ || 10 nF; output buffer isolates Vref node",
    areaEstimate: "≤ 0.05 mm² (poly-R dominated)"
  };

  return (
    <div className="space-y-6">
      {/* Design Specifications */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Design Specifications</h3>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2 transition-colors">
          <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{defaultSpecs.title}</p>
          <div className="space-y-1.5 pt-2">
            {defaultSpecs.specs.map((spec, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">{spec.label}:</span> {spec.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Agent Messages */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Agent</h3>
        <div className="space-y-3">
          {defaultMessages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              {msg.type === 'message' && (
                <p className="text-sm text-gray-700 dark:text-gray-300">{msg.text}</p>
              )}
              {msg.type === 'code' && (
                <div className="bg-gray-900 dark:bg-black rounded-lg p-3 font-mono text-xs text-green-400 transition-colors">
                  <div className="flex items-center mb-2">
                    <FileCode size={14} className="mr-2 text-gray-400" />
                    <span className="text-gray-400">{msg.code?.split('\n')[0]}</span>
                  </div>
                  <div className="space-y-1">
                    {msg.code?.split('\n').slice(1).map((line, i) => (
                      <div key={i} className="pl-6">{line}</div>
                    ))}
                  </div>
                </div>
              )}
              {msg.type === 'success' && (
                <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 size={16} />
                  <span>{msg.text}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral Summary */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">System - Behavioral Summary (from model)</h3>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2.5 transition-colors">
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Architecture:</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.architecture}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nominal Vref (27°C):</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.nominalVref}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Tempco (-40..125°C):</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.tempco}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Supply range:</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.supplyRange}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Quiescent current:</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.quiescentCurrent}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">PSRR @ 100 kHz:</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.psrr}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Startup:</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.startup}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Load/stability:</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.loadStability}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Area estimate:</span>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{defaultSummary.areaEstimate}</p>
          </div>
        </div>
      </div>

      {/* Version Control */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Version 1</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Generated by (model)</p>
          </div>
          <button className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors">
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchematicView;






