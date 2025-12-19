import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Download, Trash2, Plus } from 'lucide-react';

interface CustomSheet {
  id: string;
  name: string;
  data: any[];
  headers: string[];
}

interface CustomSheetsManagerProps {
  sheets: CustomSheet[];
  onSheetsChange: (sheets: CustomSheet[]) => void;
  isExpanded?: boolean;
}

const CustomSheetsManager: React.FC<CustomSheetsManagerProps> = ({ 
  sheets, 
  onSheetsChange,
  isExpanded = false 
}) => {
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(
    sheets.length > 0 ? sheets[0].id : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): { headers: string[]; data: any[] } => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return { headers: [], data: [] };

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });

    return { headers, data };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, data } = parseCSV(text);

      const newSheet: CustomSheet = {
        id: `sheet_${Date.now()}`,
        name: file.name.replace('.csv', ''),
        data,
        headers,
      };

      const updatedSheets = [...sheets, newSheet];
      onSheetsChange(updatedSheets);
      setSelectedSheetId(newSheet.id);
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteSheet = (sheetId: string) => {
    const updatedSheets = sheets.filter(s => s.id !== sheetId);
    onSheetsChange(updatedSheets);
    
    if (selectedSheetId === sheetId) {
      setSelectedSheetId(updatedSheets.length > 0 ? updatedSheets[0].id : null);
    }
  };

  const handleDownloadSheet = (sheet: CustomSheet) => {
    const csvContent = [
      sheet.headers.join(','),
      ...sheet.data.map(row => 
        sheet.headers.map(h => `"${row[h] || ''}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedSheet = sheets.find(s => s.id === selectedSheetId);

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header with Upload Button */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono font-semibold text-gray-200">
              Custom Sheets
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Upload and manage your own CSV/Excel data
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-mono"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {sheets.length === 0 ? (
        /* Empty State */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-mono font-semibold text-gray-300 mb-2">
              No Custom Sheets Yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Upload your own CSV files to include them in your AI conversations.
              Data will be automatically parsed and made available as context.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-mono"
            >
              <Plus className="w-4 h-4" />
              Upload Your First Sheet
            </button>
          </div>
        </div>
      ) : (
        /* Sheets List and Preview */
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Sheet List */}
          <div className="w-64 border-r border-gray-800 bg-gray-900 overflow-y-auto">
            <div className="p-3">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">
                Uploaded Sheets ({sheets.length})
              </div>
              <div className="space-y-1">
                {sheets.map(sheet => (
                  <div
                    key={sheet.id}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedSheetId === sheet.id
                        ? 'bg-red-900/20 border border-red-800'
                        : 'bg-gray-800 hover:bg-gray-750 border border-transparent'
                    }`}
                    onClick={() => setSelectedSheetId(sheet.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-mono truncate ${
                        selectedSheetId === sheet.id ? 'text-red-400' : 'text-gray-300'
                      }`}>
                        {sheet.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {sheet.data.length} rows × {sheet.headers.length} cols
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSheet(sheet);
                        }}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="Download CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSheet(sheet.id);
                        }}
                        className="p-1.5 hover:bg-red-900/30 rounded transition-colors"
                        title="Delete Sheet"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Sheet Preview */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
            {selectedSheet ? (
              <>
                {/* Sheet Header */}
                <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-mono font-semibold text-gray-200">
                        {selectedSheet.name}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {selectedSheet.data.length} rows, {selectedSheet.headers.length} columns
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadSheet(selectedSheet)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-mono"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteSheet(selectedSheet.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-900/20 hover:bg-red-900/30 text-red-400 rounded-lg transition-colors text-sm font-mono"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="flex-1 overflow-auto p-6">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden shadow ring-1 ring-gray-800 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-800">
                        <thead className="bg-gray-900">
                          <tr>
                            {selectedSheet.headers.map((header, idx) => (
                              <th
                                key={idx}
                                scope="col"
                                className="px-4 py-3 text-left text-xs font-mono font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-gray-950 divide-y divide-gray-800">
                          {selectedSheet.data.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-gray-900/50 transition-colors">
                              {selectedSheet.headers.map((header, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="px-4 py-3 text-sm font-mono text-gray-300 whitespace-nowrap"
                                >
                                  {row[header] || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 font-mono">Select a sheet to preview</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSheetsManager;