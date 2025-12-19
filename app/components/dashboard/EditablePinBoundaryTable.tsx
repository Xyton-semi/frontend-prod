import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Save, X, Plus, Trash2, Download, Filter, ArrowUpDown, AlertCircle, Columns, GripVertical } from 'lucide-react';

interface PinBoundaryRow {
  [key: string]: string;
}

interface EditablePinBoundaryTableProps {
  initialData: PinBoundaryRow[];
  onSave?: (data: PinBoundaryRow[]) => void;
  onCancel?: () => void;
}

type SortDirection = 'asc' | 'desc' | null;
type FilterConfig = { [key: string]: string };

/**
 * Parse and evaluate filter expressions
 */
function evaluateFilter(cellValue: string, filterExpression: string): boolean {
  if (!filterExpression) return true;
  
  const expr = filterExpression.trim();
  if (!expr) return true;

  const numValue = parseFloat(cellValue);
  const isNumber = !isNaN(numValue);

  if (expr.startsWith('>=')) {
    const targetValue = parseFloat(expr.substring(2));
    return isNumber && !isNaN(targetValue) && numValue >= targetValue;
  }
  
  if (expr.startsWith('<=')) {
    const targetValue = parseFloat(expr.substring(2));
    return isNumber && !isNaN(targetValue) && numValue <= targetValue;
  }
  
  if (expr.startsWith('<>')) {
    const targetValue = expr.substring(2).trim();
    return cellValue.toLowerCase() !== targetValue.toLowerCase();
  }
  
  if (expr.startsWith('>')) {
    const targetValue = parseFloat(expr.substring(1));
    return isNumber && !isNaN(targetValue) && numValue > targetValue;
  }
  
  if (expr.startsWith('<')) {
    const targetValue = parseFloat(expr.substring(1));
    return isNumber && !isNaN(targetValue) && numValue < targetValue;
  }
  
  if (expr.startsWith('=')) {
    const targetValue = expr.substring(1).trim();
    if (isNumber) {
      const targetNum = parseFloat(targetValue);
      return !isNaN(targetNum) && numValue === targetNum;
    }
    return cellValue.toLowerCase() === targetValue.toLowerCase();
  }

  return cellValue.toLowerCase().includes(expr.toLowerCase());
}

const EditablePinBoundaryTable: React.FC<EditablePinBoundaryTableProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [data, setData] = useState<PinBoundaryRow[]>(initialData);
  const [columns, setColumns] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Excel-like features
  const [filters, setFilters] = useState<FilterConfig>({});
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [showFilterRow, setShowFilterRow] = useState(false);
  const [formulaMode, setFormulaMode] = useState<{ [key: string]: boolean }>({});
  const [filterErrors, setFilterErrors] = useState<{ [key: string]: string }>({});
  
  // Column management
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  
  // Resizing
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  useEffect(() => {
    if (initialData.length > 0) {
      const cols = Object.keys(initialData[0]);
      setColumns(cols);
      
      // Initialize default column widths
      const defaultWidths: { [key: string]: number } = {};
      cols.forEach(col => {
        defaultWidths[col] = 150;
      });
      setColumnWidths(defaultWidths);
    }
    setData(initialData);
  }, [initialData]);

  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setResizingColumn(column);
    setResizeStartX(e.clientX);
    setResizeStartWidth(columnWidths[column] || 150);
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX;
      const newWidth = Math.max(80, resizeStartWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
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

  const handleCellEdit = (rowIndex: number, field: string, value: string) => {
    const newData = [...data];
    
    if (value.startsWith('=')) {
      const cellKey = `${rowIndex}-${field}`;
      setFormulaMode(prev => ({ ...prev, [cellKey]: true }));
    }
    
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setData(newData);
    setHasChanges(true);
  };

  const getDisplayValue = (row: PinBoundaryRow, field: string, rowIndex: number): string => {
    const value = row[field];
    const cellKey = `${rowIndex}-${field}`;
    
    if (typeof value === 'string' && value.startsWith('=') && !formulaMode[cellKey]) {
      return evaluateFormula(value, rowIndex);
    }
    return value || '';
  };

  const handleSort = (column: string) => {
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
    const errors: { [key: string]: string } = {};

    Object.entries(filters).forEach(([key, filterValue]) => {
      if (filterValue) {
        try {
          result = result.filter(row => {
            const cellValue = row[key]?.toString() || '';
            return evaluateFilter(cellValue, filterValue);
          });
          delete errors[key];
        } catch (error) {
          errors[key] = 'Invalid filter';
        }
      }
    });

    setFilterErrors(errors);

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
    const newRow: PinBoundaryRow = {};
    columns.forEach(col => {
      newRow[col] = '';
    });
    setData([...data, newRow]);
    setHasChanges(true);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    
    const columnName = newColumnName.trim();
    if (columns.includes(columnName)) {
      alert('Column already exists!');
      return;
    }
    
    // Add column to all rows
    const newData = data.map(row => ({
      ...row,
      [columnName]: ''
    }));
    
    setData(newData);
    setColumns([...columns, columnName]);
    setColumnWidths(prev => ({ ...prev, [columnName]: 150 }));
    setNewColumnName('');
    setShowAddColumnModal(false);
    setHasChanges(true);
  };

  const handleDeleteColumn = (columnName: string) => {
    if (!confirm(`Delete column "${columnName}"?`)) return;
    
    const newData = data.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });
    
    setData(newData);
    setColumns(columns.filter(col => col !== columnName));
    
    const newWidths = { ...columnWidths };
    delete newWidths[columnName];
    setColumnWidths(newWidths);
    
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
    if (initialData.length > 0) {
      setColumns(Object.keys(initialData[0]));
    }
    setHasChanges(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleExport = () => {
    const csvContent = [
      columns.join(','),
      ...data.map(row => 
        columns.map(col => {
          const value = row[col] || '';
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

  const handleFilterChange = (column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setFilterErrors({});
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
    field: string,
    isEditing: boolean
  ) => {
    const cellKey = `${rowIndex}-${field}`;
    const isFormula = row[field]?.toString().startsWith('=');

    if (isEditing) {
      return (
        <input
          type="text"
          value={row[field] || ''}
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

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
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
            Add Row
          </button>
          <button
            onClick={() => setShowAddColumnModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-green-400 hover:text-green-300 hover:bg-gray-800 rounded transition-colors"
          >
            <Columns size={14} />
            Add Column
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
        <div className="flex items-center gap-2">
          {Object.keys(filterErrors).length > 0 && (
            <div className="flex items-center gap-1 text-xs text-yellow-500">
              <AlertCircle size={12} />
              <span>Filter errors</span>
            </div>
          )}
          <span className="text-xs font-mono text-gray-500">
            {filteredAndSortedData.length} / {data.length} rows
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b border-gray-700">
              {columns.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-xs font-mono text-gray-400 uppercase tracking-wider relative group"
                  style={{ width: columnWidths[header] || 150, minWidth: 80 }}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-1 cursor-pointer flex-1"
                      onClick={() => handleSort(header)}
                    >
                      <span className="truncate">{header}</span>
                      {sortColumn === header && (
                        <span className="text-red-400">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteColumn(header)}
                      className="ml-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                      title="Delete column"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {/* Resize Handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-red-500 transition-colors"
                    onMouseDown={(e) => handleResizeStart(e, header)}
                  >
                    <GripVertical size={12} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 text-gray-500" />
                  </div>
                </th>
              ))}
              <th className="px-3 py-2 text-xs font-mono text-gray-400 uppercase tracking-wider w-16">
                
              </th>
            </tr>
            
            {/* Filter Row */}
            {showFilterRow && (
              <tr className="border-b border-gray-700 bg-gray-850">
                {columns.map((header) => (
                  <th key={header} className="px-3 py-1">
                    <input
                      type="text"
                      placeholder="filter..."
                      value={filters[header] || ''}
                      onChange={(e) => handleFilterChange(header, e.target.value)}
                      className={`w-full px-2 py-1 text-xs bg-gray-900 text-gray-300 border rounded focus:outline-none focus:border-red-500 ${
                        filterErrors[header] 
                          ? 'border-yellow-500 bg-yellow-900/10' 
                          : 'border-gray-700'
                      }`}
                      title={filterErrors[header] || 'Use: =, >, <, >=, <=, <>, or text'}
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
                  className={`border-b border-gray-800 ${getRowTypeColor(row['RowType'])} hover:bg-gray-800/50 transition-colors`}
                >
                  {columns.map((header) => {
                    const isEditing = editingCell?.rowIndex === originalIndex && editingCell?.field === header;
                    return (
                      <td
                        key={header}
                        className="px-3 py-2 cursor-pointer"
                        onClick={() => !isEditing && setEditingCell({ rowIndex: originalIndex, field: header })}
                        style={{ width: columnWidths[header] || 150, minWidth: 80 }}
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