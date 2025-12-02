"use client"

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface PinBoundaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvData: Record<string, string>[];
}

const PinBoundaryModal: React.FC<PinBoundaryModalProps> = ({ isOpen, onClose, csvData }) => {
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

  const getRowTypeColor = (rowType: string) => {
    if (!rowType) return 'bg-gray-50 border-gray-200';
    switch (rowType.toLowerCase()) {
      case 'pin':
        return 'bg-blue-50 border-blue-200';
      case 'boundary':
        return 'bg-green-50 border-green-200';
      case 'decision':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const headers = csvData && csvData.length > 0 ? Object.keys(csvData[0]) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Pin and Boundary Definition</h2>
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
                    <th key={h} className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csvData.map((row, index) => {
                  const rowType = row['RowType'] || row['Row Type'] || '';
                  return (
                    <tr key={index} className={`hover:bg-gray-50 ${getRowTypeColor(rowType)}`}>
                      {headers.map((h) => (
                        <td key={h} className="border border-gray-300 px-4 py-2 text-gray-600">
                          {row[h]}
                        </td>
                      ))}
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

export default PinBoundaryModal;

