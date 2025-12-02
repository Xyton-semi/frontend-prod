"use client"

import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';

interface LayoutViewProps {
  layoutImage?: string;
}

const LayoutView: React.FC<LayoutViewProps> = ({ layoutImage }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Final Layout</h3>
        <button className="flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors">
          <ArrowLeft size={16} className="mr-2" />
          Export
        </button>
      </div>

      {/* Layout Visualization */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="relative bg-white rounded border-2 border-gray-300 overflow-hidden" style={{ aspectRatio: '4/3' }}>
          {/* Simplified layout representation */}
          <svg width="100%" height="100%" viewBox="0 0 400 300" className="absolute inset-0">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e7eb" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Layout sections */}
            {/* Squaring Circuit */}
            <g>
              <rect x="20" y="20" width="120" height="80" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" strokeWidth="2" />
              <text x="80" y="65" textAnchor="middle" fontSize="10" fill="#1e40af" fontWeight="bold">SQUARING CIRCUIT</text>
            </g>
            
            {/* Op-Amps */}
            <g>
              <rect x="160" y="20" width="100" height="80" fill="#ef4444" opacity="0.3" stroke="#ef4444" strokeWidth="2" />
              <text x="210" y="65" textAnchor="middle" fontSize="10" fill="#991b1b" fontWeight="bold">OP-AMPS</text>
            </g>
            
            {/* Current Mirrors */}
            <g>
              <rect x="20" y="120" width="120" height="80" fill="#10b981" opacity="0.3" stroke="#10b981" strokeWidth="2" />
              <text x="80" y="165" textAnchor="middle" fontSize="10" fill="#065f46" fontWeight="bold">CURRENT MIRRORS</text>
            </g>
            
            {/* Trimming */}
            <g>
              <rect x="20" y="220" width="80" height="50" fill="#f59e0b" opacity="0.3" stroke="#f59e0b" strokeWidth="2" />
              <text x="60" y="247" textAnchor="middle" fontSize="9" fill="#92400e" fontWeight="bold">TRIMMING</text>
            </g>
            
            {/* BJTs */}
            <g>
              <rect x="280" y="20" width="100" height="180" fill="#8b5cf6" opacity="0.3" stroke="#8b5cf6" strokeWidth="2" />
              <text x="330" y="115" textAnchor="middle" fontSize="10" fill="#5b21b6" fontWeight="bold">BJT&apos;S</text>
            </g>
            
            {/* Resistances */}
            <g>
              <rect x="280" y="220" width="100" height="50" fill="#ec4899" opacity="0.3" stroke="#ec4899" strokeWidth="2" />
              <text x="330" y="247" textAnchor="middle" fontSize="9" fill="#9f1239" fontWeight="bold">RESISTANCES</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Layout Information */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Area:</span>
          <span className="text-xs text-gray-600">0.048 mm²</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Technology:</span>
          <span className="text-xs text-gray-600">180nm CMOS</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">Status:</span>
          <span className="text-xs text-green-600 font-medium">Ready for Export</span>
        </div>
      </div>

      {/* Export Options */}
      <div className="flex items-center space-x-2 pt-2">
        <button className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center">
          <Download size={16} className="mr-2" />
          Export GDSII
        </button>
        <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors">
          Export DXF
        </button>
      </div>
    </div>
  );
};

export default LayoutView;






