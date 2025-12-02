"use client"

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface RequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvData: Record<string, string>[];
}

const RequirementsModal: React.FC<RequirementsModalProps> = ({ isOpen, onClose, csvData }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getPriorityColor = (priority: string) => {
    if (!priority) return 'bg-gray-50 border-gray-200';
    switch (priority?.toUpperCase()) {
      case 'H':
        return 'bg-red-50 border-red-200';
      case 'M':
        return 'bg-yellow-50 border-yellow-200';
      case 'L':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toUpperCase()) {
      case 'H':
        return 'text-red-600 font-semibold';
      case 'M':
        return 'text-yellow-600 font-semibold';
      case 'L':
        return 'text-green-600 font-semibold';
      default:
        return 'text-gray-600';
    }
  };

  const headers = csvData && csvData.length > 0 ? Object.keys(csvData[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Requirements and Feasibility (USCM)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.map((row, index) => {
                  const priority = row['Priority'] || '';
                  const difficulty = row['Difficulty'] || '';
                  return (
                    <tr key={index} className={`hover:bg-gray-50 ${getPriorityColor(priority)}`}>
                      {headers.map((h) => {
                        const value = row[h];
                        // Special formatting for Priority and Difficulty columns
                        if (h === 'Priority') {
                          return (
                            <td key={h} className="border border-gray-300 px-3 py-2 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                value === 'H' ? 'bg-red-100 text-red-700' :
                                value === 'M' ? 'bg-yellow-100 text-yellow-700' :
                                value === 'L' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {value || '-'}
                              </span>
                            </td>
                          );
                        }

                        if (h === 'Difficulty') {
                          return (
                            <td key={h} className="border border-gray-300 px-3 py-2 text-center">
                              <span className={getDifficultyColor(value)}>{value || '-'}</span>
                            </td>
                          );
                        }

                        return (
                          <td key={h} className="border border-gray-300 px-3 py-2 text-gray-600">
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequirementsModal;

