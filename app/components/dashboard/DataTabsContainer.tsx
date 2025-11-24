"use client"

import React from 'react';
import { FileSpreadsheet, FileCheck } from 'lucide-react';

interface DataTabsContainerProps {
  onOpenRequirements?: () => void;
  onOpenPinBoundary?: () => void;
}

const DataTabsContainer: React.FC<DataTabsContainerProps> = ({ onOpenRequirements, onOpenPinBoundary }) => {
  return (
    <div className="flex items-center gap-0">
      {/* Requirements Tab */}
      <button
        onClick={() => onOpenRequirements && onOpenRequirements()}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap ${
            'text-gray-600 dark:text-gray-400 border-b-transparent hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        title="Requirements and Feasibility (USCM)"
      >
        <FileCheck size={16} className="text-red-600" />
        <span>Requirements</span>
      </button>

      {/* Pin & Boundary Tab */}
      <button
        onClick={() => onOpenPinBoundary && onOpenPinBoundary()}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors duration-150 border-b-2 whitespace-nowrap ${
            'text-gray-600 dark:text-gray-400 border-b-transparent hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        title="Pin and Boundary Definition"
      >
        <FileSpreadsheet size={16} className="text-red-600" />
        <span>Pin & Boundary</span>
      </button>
    </div>
  );
};

export default DataTabsContainer;





