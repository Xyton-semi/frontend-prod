import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, Download, Trash2, Plus, Columns, GripVertical, Edit2 } from 'lucide-react';

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
  const [editingCell, setEditingCell] = useState<{ sheetId: string; rowIndex: number; header: string } | null>(null);
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [editingSheetName, setEditingSheetName] = useState<string | null>(null);
  const [newSheetName, setNewSheetName] = useState('');
  
  // Resizing state
  const [columnWidths, setColumnWidths] = useState<{ [sheetId: string]: { [header: string]: number } }>({});
  const [resizingColumn, setResizingColumn] = useState<{ sheetId: string; header: string } | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  
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
      
      // Initialize column widths
      const widths: { [header: string]: number } = {};
      headers.forEach(h => widths[h] = 150);
      setColumnWidths(prev => ({ ...prev, [newSheet.id]: widths }));
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResizeStart = (e: React.MouseEvent, sheetId: string, header: string) => {
    e.preventDefault();
    setResizingColumn({ sheetId, header });
    setResizeStartX(e.clientX);
    const currentWidth = columnWidths[sheetId]?.[header] || 150;
    setResizeStartWidth(currentWidth);
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn.sheetId]: {
          ...(prev[resizingColumn.sheetId] || {}),
          [resizingColumn.header]: newWidth
        }
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth]);

  const handleCellEdit = (sheetId: string, rowIndex: number, header: string, value: string) => {
    const updatedSheets = sheets.map(sheet => {
      if (sheet.id === sheetId) {
        const newData = [...sheet.data];
        newData[rowIndex] = { ...newData[rowIndex], [header]: value };
        return { ...sheet, data: newData };
      }
      return sheet;
    });
    onSheetsChange(updatedSheets);
  };

  const handleAddRow = (sheetId: string) => {
    const sheet = sheets.find(s => s.id === sheetId);
    if (!sheet) return;

    const newRow: any = {};
    sheet.headers.forEach(header => {
      newRow[header] = '';
    });

    const updatedSheets = sheets.map(s => {
      if (s.id === sheetId) {
        return { ...s, data: [...s.data, newRow] };
      }
      return s;
    });

    onSheetsChange(updatedSheets);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim() || !selectedSheetId) return;

    const sheet = sheets.find(s => s.id === selectedSheetId);
    if (!sheet) return;

    const columnName = newColumnName.trim();
    if (sheet.headers.includes(columnName)) {
      alert('Column already exists!');
      return;
    }

    const updatedSheets = sheets.map(s => {
      if (s.id === selectedSheetId) {
        const newData = s.data.map(row => ({ ...row, [columnName]: '' }));
        return {
          ...s,
          headers: [...s.headers, columnName],
          data: newData
        };
      }
      return s;
    });

    onSheetsChange(updatedSheets);
    
    // Initialize column width
    setColumnWidths(prev => ({
      ...prev,
      [selectedSheetId]: {
        ...(prev[selectedSheetId] || {}),
        [columnName]: 150
      }
    }));
    
    setNewColumnName('');
    setShowAddColumnModal(false);
  };

  const handleDeleteColumn = (sheetId: string, header: string) => {
    if (!confirm(`Delete column "${header}"?`)) return;

    const updatedSheets = sheets.map(sheet => {
      if (sheet.id === sheetId) {
        const newData = sheet.data.map(row => {
          const newRow = { ...row };
          delete newRow[header];
          return newRow;
        });
        return {
          ...sheet,
          headers: sheet.headers.filter(h => h !== header),
          data: newData
        };
      }
      return sheet;
    });

    onSheetsChange(updatedSheets);
    
    // Remove column width
    setColumnWidths(prev => {
      const newWidths = { ...prev };
      if (newWidths[sheetId]) {
        delete newWidths[sheetId][header];
      }
      return newWidths;
    });
  };

  const handleDeleteRow = (sheetId: string, rowIndex: number) => {
    const updatedSheets = sheets.map(sheet => {
      if (sheet.id === sheetId) {
        return {
          ...sheet,
          data: sheet.data.filter((_, idx) => idx !== rowIndex)
        };
      }
      return sheet;
    });

    onSheetsChange(updatedSheets);
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

  const handleRenameSheet = (sheetId: string) => {
    if (!newSheetName.trim()) return;

    const updatedSheets = sheets.map(sheet => {
      if (sheet.id === sheetId) {
        return { ...sheet, name: newSheetName.trim() };
      }
      return sheet;
    });

    onSheetsChange(updatedSheets);
    setEditingSheetName(null);
    setNewSheetName('');
  };

  const selectedSheet = sheets.find(s => s.id === selectedSheetId);

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Add Column Modal */}
      {showAddColumnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Add New Column</h3>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddColumn();
                if (e.key === 'Escape') setShowAddColumnModal(false);
              }}
              placeholder="Column name..."
              autoFocus
              className="w-full px-3 py-2 bg-gray-700 text-gray-100 border border-gray-600 rounded focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddColumn}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
              >
                Add Column
              </button>
              <button
                onClick={() => setShowAddColumnModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                      {editingSheetName === sheet.id ? (
                        <input
                          type="text"
                          value={newSheetName}
                          onChange={(e) => setNewSheetName(e.target.value)}
                          onBlur={() => handleRenameSheet(sheet.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSheet(sheet.id);
                            if (e.key === 'Escape') setEditingSheetName(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full px-2 py-1 text-sm bg-gray-700 text-gray-100 border border-red-500 rounded focus:outline-none"
                        />
                      ) : (
                        <div className={`text-sm font-mono truncate ${
                          selectedSheetId === sheet.id ? 'text-red-400' : 'text-gray-300'
                        }`}>
                          {sheet.name}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {sheet.data.length} rows × {sheet.headers.length} cols
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSheetName(sheet.id);
                          setNewSheetName(sheet.name);
                        }}
                        className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                        title="Rename Sheet"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                      </button>
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
                {/* Sheet Header with Actions */}
                <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900 px-6 py-3">
                  <div className="flex items-center justify-between mb-2">
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
                        onClick={() => handleAddRow(selectedSheet.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-mono"
                      >
                        <Plus className="w-4 h-4" />
                        Add Row
                      </button>
                      <button
                        onClick={() => setShowAddColumnModal(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-mono"
                      >
                        <Columns className="w-4 h-4" />
                        Add Column
                      </button>
                      <button
                        onClick={() => handleDownloadSheet(selectedSheet)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm font-mono"
                      >
                        <Download className="w-4 h-4" />
                        Download
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
                                className="px-4 py-3 text-left text-xs font-mono font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap relative group"
                                style={{ 
                                  width: columnWidths[selectedSheet.id]?.[header] || 150,
                                  minWidth: 80 
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="truncate">{header}</span>
                                  <button
                                    onClick={() => handleDeleteColumn(selectedSheet.id, header)}
                                    className="ml-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                    title="Delete column"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                                {/* Resize Handle */}
                                <div
                                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-red-500 transition-colors"
                                  onMouseDown={(e) => handleResizeStart(e, selectedSheet.id, header)}
                                >
                                  <GripVertical size={12} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 text-gray-500" />
                                </div>
                              </th>
                            ))}
                            <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-gray-400 uppercase tracking-wider w-16">
                              
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-gray-950 divide-y divide-gray-800">
                          {selectedSheet.data.map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-gray-900/50 transition-colors group">
                              {selectedSheet.headers.map((header, colIdx) => {
                                const isEditing = editingCell?.sheetId === selectedSheet.id && 
                                                 editingCell?.rowIndex === rowIdx && 
                                                 editingCell?.header === header;
                                
                                return (
                                  <td
                                    key={colIdx}
                                    className="px-4 py-3 text-sm font-mono text-gray-300 whitespace-nowrap cursor-pointer"
                                    onClick={() => setEditingCell({ sheetId: selectedSheet.id, rowIndex: rowIdx, header })}
                                    style={{ 
                                      width: columnWidths[selectedSheet.id]?.[header] || 150,
                                      minWidth: 80 
                                    }}
                                  >
                                    {isEditing ? (
                                      <input
                                        type="text"
                                        value={row[header] || ''}
                                        onChange={(e) => handleCellEdit(selectedSheet.id, rowIdx, header, e.target.value)}
                                        onBlur={() => setEditingCell(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') setEditingCell(null);
                                          if (e.key === 'Escape') setEditingCell(null);
                                        }}
                                        autoFocus
                                        className="w-full px-2 py-1 text-xs bg-gray-700 text-gray-100 border border-red-500 rounded focus:outline-none"
                                      />
                                    ) : (
                                      <span>{row[header] || '-'}</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeleteRow(selectedSheet.id, rowIdx)}
                                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
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