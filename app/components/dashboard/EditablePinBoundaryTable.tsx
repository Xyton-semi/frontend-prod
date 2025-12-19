import React, { useState, useEffect, useMemo } from 'react';
import { Save, X, Plus, Trash2, Download, Filter, ArrowUpDown } from 'lucide-react';

interface PinBoundaryRow {
  RowType: string;
  Name: string;
  PadConn: string;
  Direction: string;
  Function: string;
  'Definition / Notes': string;
  VoltageMin: string;
  VoltageMax: string;
  Units: string;
  ESD_HBM_kV: string;
  ESD_CDM_V: string;
  Value: string;
  ValueUnits: string;
  Comments: string;
}

interface EditablePinBoundaryTableProps {
  initialData: PinBoundaryRow[];
  onSave?: (data: PinBoundaryRow[]) => void;
  onCancel?: () => void;
}

type SortDirection = 'asc' | 'desc' | null;
type FilterConfig = { [key: string]: string };

const EditablePinBoundaryTable: React.FC<EditablePinBoundaryTableProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [data, setData] = useState<PinBoundaryRow[]>(initialData);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Excel-like features
  const [filters, setFilters] = useState<FilterConfig>({});
  const [sortColumn, setSortColumn] = useState<keyof PinBoundaryRow | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [formulaMode, setFormulaMode] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Evaluate Excel-like formulas
  const evaluateFormula = (formula: string, rowIndex: number): string => {
    try {
      const expr = formula.slice(1).trim();
      
      if (expr.toUpperCase().startsWith('SUM(')) {
        const match = expr.match(/SUM\(([^)]+)\)/i);
        if (match) {
          const values = match[1].split(',').map(v => parseFloat(v.trim()) || 0);
          return values.reduce((a, b) => a + b, 0).toString();
        }
      }
      
      if (expr.toUpperCase().startsWith('AVERAGE(')) {
        const match = expr.match(/AVERAGE\(([^)]+)\)/i);
        if (match) {
          const values = match[1].split(',').map(v => parseFloat(v.trim()) || 0);
          const sum = values.reduce((a, b) => a + b, 0);
          return (sum / values.length).toFixed(2);
        }
      }
      
      const sanitized = expr.replace(/[^0-9+\-*/.() ]/g, '');
      const result = eval(sanitized);
      return result.toString();
    } catch (error) {
      return '#ERROR';
    }
  };

  const handleCellEdit = (rowIndex: number, field: keyof PinBoundaryRow, value: string) => {
    const newData = [...data];
    
    if (value.startsWith('=')) {
      const cellKey = `${rowIndex}-${field}`;
      setFormulaMode(prev => ({ ...prev, [cellKey]: true }));
    }
    
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setData(newData);
    setHasChanges(true);
  };

  const getDisplayValue = (row: PinBoundaryRow, field: keyof PinBoundaryRow, rowIndex: number): string => {
    const value = row[field];
    const cellKey = `${rowIndex}-${field}`;
    
    if (typeof value === 'string' && value.startsWith('=') && !formulaMode[cellKey]) {
      return evaluateFormula(value, rowIndex);
    }
    return value;
  };

  const handleSort = (column: keyof PinBoundaryRow) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter(row => {
          const cellValue = row[key as keyof PinBoundaryRow]?.toString().toLowerCase() || '';
          return cellValue.includes(filterValue.toLowerCase());
        });
      }
    });

    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortColumn]?.toString() || '';
        const bVal = b[sortColumn]?.toString() || '';
        
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
    }

    return result;
  }, [data, filters, sortColumn, sortDirection]);

  const handleAddRow = () => {
    const newRow: PinBoundaryRow = {
      RowType: 'Pin',
      Name: '',
      PadConn: 'N',
      Direction: '',
      Function: '',
      'Definition / Notes': '',
      VoltageMin: '',
      VoltageMax: '',
      Units: 'V',
      ESD_HBM_kV: '',
      ESD_CDM_V: '',
      Value: '',
      ValueUnits: '',
      Comments: '',
    };
    setData([...data, newRow]);
    setHasChanges(true);
  };

  const handleDeleteRow = (rowIndex: number) => {
    setData(data.filter((_, index) => index !== rowIndex));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(data);
    }
    setHasChanges(false);
  };

  const handleCancel = () => {
    setData(initialData);
    setHasChanges(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleExport = () => {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header as keyof PinBoundaryRow];
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pin_boundary_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFilterChange = (column: keyof PinBoundaryRow, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getRowTypeColor = (rowType: string) => {
    switch (rowType?.toLowerCase()) {
      case 'pin':
        return 'bg-blue-900/30 dark:bg-blue-900/20';
      case 'boundary':
        return 'bg-green-900/30 dark:bg-green-900/20';
      case 'decision':
        return 'bg-yellow-900/30 dark:bg-yellow-900/20';
      default:
        return 'bg-gray-800 dark:bg-gray-900';
    }
  };

  const renderCell = (
    row: PinBoundaryRow,
    rowIndex: number,
    field: keyof PinBoundaryRow,
    isEditing: boolean
  ) => {
    const cellKey = `${rowIndex}-${field}`;
    const isFormula = row[field]?.toString().startsWith('=');

    if (isEditing) {
      if (field === 'RowType') {
        return (
          <select
            value={row[field]}
            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="w-full px-2 py-1 text-xs border border-red-500 rounded bg-gray-700 text-gray-100"
          >
            <option value="Pin">Pin</option>
            <option value="Boundary">Boundary</option>
            <option value="Decision">Decision</option>
          </select>
        );
      }

      if (field === 'PadConn') {
        return (
          <select
            value={row[field]}
            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="w-full px-2 py-1 text-xs border border-red-500 rounded bg-gray-700 text-gray-100"
          >
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        );
      }

      if (field === 'Direction') {
        return (
          <select
            value={row[field]}
            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="w-full px-2 py-1 text-xs border border-red-500 rounded bg-gray-700 text-gray-100"
          >
            <option value="">Select...</option>
            <option value="Input">Input</option>
            <option value="Output">Output</option>
            <option value="Bidirectional">Bidirectional</option>
            <option value="Bidirectional (return)">Bidirectional (return)</option>
          </select>
        );
      }

      return (
        <input
          type="text"
          value={row[field]}
          onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
          onBlur={() => {
            setEditingCell(null);
            setFormulaMode(prev => ({ ...prev, [cellKey]: false }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setEditingCell(null);
              setFormulaMode(prev => ({ ...prev, [cellKey]: false }));
            }
            if (e.key === 'Escape') {
              setData(initialData);
              setEditingCell(null);
            }
          }}
          autoFocus
          className="w-full px-2 py-1 text-xs border border-red-500 rounded bg-gray-700 text-gray-100"
        />
      );
    }

    return (
      <div className={`text-xs text-gray-300 ${isFormula ? 'font-mono' : ''}`}>
        {getDisplayValue(row, field, rowIndex) || '—'}
        {isFormula && <span className="ml-1 text-[10px] text-blue-400">ƒ</span>}
      </div>
    );
  };

  const headers: (keyof PinBoundaryRow)[] = [
    'RowType',
    'Name',
    'PadConn',
    'Direction',
    'Function',
    'VoltageMin',
    'VoltageMax',
    'Units',
    'Comments',
  ];

  const headerLabels: Record<keyof PinBoundaryRow, string> = {
    RowType: 'Type',
    Name: 'Name',
    PadConn: 'Pad',
    Direction: 'Direction',
    Function: 'Function',
    'Definition / Notes': 'Notes',
    VoltageMin: 'V Min',
    VoltageMax: 'V Max',
    Units: 'Units',
    ESD_HBM_kV: 'HBM',
    ESD_CDM_V: 'CDM',
    Value: 'Value',
    ValueUnits: 'V Units',
    Comments: 'Comments',
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Compact Action Bar */}
      {hasChanges && (
        <div className="flex items-center justify-between px-4 py-2 bg-red-900/20 border-b border-red-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-mono text-red-300 uppercase tracking-wider">
              Unsaved Changes
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1 text-xs font-mono text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-blue-400 hover:text-blue-300 hover:bg-gray-800 rounded transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
          >
            <Download size={14} />
            Export
          </button>
          <div className="h-4 w-px bg-gray-700 mx-1"></div>
          <button
            onClick={() => setShowFilterRow(!showFilterRow)}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-mono rounded transition-colors ${
              showFilterRow 
                ? 'text-red-400 bg-gray-800' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            <Filter size={14} />
            Filter
          </button>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs font-mono text-gray-500 hover:text-gray-300"
            >
              Clear ({Object.values(filters).filter(Boolean).length})
            </button>
          )}
        </div>
        <span className="text-xs font-mono text-gray-500">
          {filteredAndSortedData.length} rows
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-700">
              {headers.map((header) => (
                <th
                  key={header}
                  onClick={() => handleSort(header)}
                  className="px-3 py-2 text-xs font-mono text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {headerLabels[header]}
                    {sortColumn === header && (
                      <span className="text-red-400">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-xs font-mono text-gray-400 uppercase tracking-wider w-16">
                
              </th>
            </tr>
            
            {/* Filter Row */}
            {showFilterRow && (
              <tr className="border-b border-gray-700 bg-gray-850">
                {headers.map((header) => (
                  <th key={header} className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="..."
                      value={filters[header] || ''}
                      onChange={(e) => handleFilterChange(header, e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-gray-900 text-gray-300 border border-gray-700 rounded focus:outline-none focus:border-red-500"
                    />
                  </th>
                ))}
                <th></th>
              </tr>
            )}
          </thead>

          <tbody>
            {filteredAndSortedData.map((row, index) => {
              const originalIndex = data.findIndex(r => r === row);
              return (
                <tr
                  key={originalIndex}
                  className={`border-b border-gray-800 ${getRowTypeColor(row.RowType)} hover:bg-gray-800/50 transition-colors`}
                >
                  {headers.map((header) => {
                    const isEditing = editingCell?.rowIndex === originalIndex && editingCell?.field === header;
                    return (
                      <td
                        key={header}
                        className="px-3 py-2 cursor-pointer"
                        onClick={() => !isEditing && setEditingCell({ rowIndex: originalIndex, field: header })}
                      >
                        {renderCell(row, originalIndex, header, isEditing)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDeleteRow(originalIndex)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditablePinBoundaryTable;