import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, AlertCircle, Download } from 'lucide-react';

interface RequirementsRow {
  'Spec Category': string;
  Parameter: string;
  Symbol: string;
  'Definition / Test Condition': string;
  'User Target Min': string;
  'User Target Typ': string;
  'User Target Max': string;
  'Actual Min': string;
  'Actual Typ': string;
  'Actual Max': string;
  Units: string;
  'Physical Trade-off / Sensitivity': string;
  Priority: string;
  Difficulty: string;
  'Comments / Pin Mapping': string;
  'Specification Source': string;
}

interface EditableRequirementsTableProps {
  initialData: RequirementsRow[];
  onSave?: (data: RequirementsRow[]) => void;
  onCancel?: () => void;
}

const EditableRequirementsTable: React.FC<EditableRequirementsTableProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [data, setData] = useState<RequirementsRow[]>(initialData);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const validateNumericField = (value: string): boolean => {
    if (value === '') return true;
    const num = parseFloat(value);
    return !isNaN(num);
  };

  const handleCellEdit = (rowIndex: number, field: keyof RequirementsRow, value: string) => {
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setData(newData);
    setHasChanges(true);

    const numericFields = ['User Target Min', 'User Target Typ', 'User Target Max', 'Actual Min', 'Actual Typ', 'Actual Max'];
    if (numericFields.includes(field) && !validateNumericField(value)) {
      const errorKey = `${rowIndex}-${field}`;
      const newErrors = new Map(validationErrors);
      newErrors.set(errorKey, 'Invalid number');
      setValidationErrors(newErrors);
    } else {
      const errorKey = `${rowIndex}-${field}`;
      const newErrors = new Map(validationErrors);
      newErrors.delete(errorKey);
      setValidationErrors(newErrors);
    }
  };

  const handleAddRow = () => {
    const newRow: RequirementsRow = {
      'Spec Category': 'DC Operating',
      Parameter: '',
      Symbol: '',
      'Definition / Test Condition': '',
      'User Target Min': '',
      'User Target Typ': '',
      'User Target Max': '',
      'Actual Min': '',
      'Actual Typ': '',
      'Actual Max': '',
      Units: '',
      'Physical Trade-off / Sensitivity': '',
      Priority: 'M',
      Difficulty: 'M',
      'Comments / Pin Mapping': '',
      'Specification Source': 'User',
    };
    setData([...data, newRow]);
    setHasChanges(true);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = data.filter((_, index) => index !== rowIndex);
    setData(newData);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (validationErrors.size > 0) {
      alert('Please fix validation errors before saving');
      return;
    }
    if (onSave) {
      onSave(data);
    }
    setHasChanges(false);
  };

  const handleCancel = () => {
    setData(initialData);
    setHasChanges(false);
    setValidationErrors(new Map());
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
          const value = row[header as keyof RequirementsRow];
          if (value.includes(',') || value.includes('"')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requirements_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'H':
        return 'bg-red-900/30 text-red-300';
      case 'M':
        return 'bg-yellow-900/30 text-yellow-300';
      case 'L':
        return 'bg-green-900/30 text-green-300';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toUpperCase()) {
      case 'H':
        return 'text-red-400';
      case 'M':
        return 'text-yellow-400';
      case 'L':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const renderCell = (
    row: RequirementsRow,
    rowIndex: number,
    field: keyof RequirementsRow,
    isEditing: boolean
  ) => {
    const errorKey = `${rowIndex}-${field}`;
    const hasError = validationErrors.has(errorKey);

    if (isEditing) {
      if (field === 'Spec Category') {
        return (
          <select
            value={row[field]}
            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="w-full px-2 py-1 text-xs border border-red-500 rounded bg-gray-700 text-gray-100"
          >
            <option value="DC Operating">DC Operating</option>
            <option value="Dynamic">Dynamic</option>
            <option value="Protection">Protection</option>
            <option value="Control">Control</option>
            <option value="Reliability">Reliability</option>
            <option value="Transient">Transient</option>
            <option value="Decision">Decision</option>
          </select>
        );
      }

      if (field === 'Priority' || field === 'Difficulty') {
        return (
          <select
            value={row[field]}
            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            autoFocus
            className="w-full px-2 py-1 text-xs border border-red-500 rounded bg-gray-700 text-gray-100"
          >
            <option value="H">High (H)</option>
            <option value="M">Medium (M)</option>
            <option value="L">Low (L)</option>
          </select>
        );
      }

      return (
        <div className="relative">
          <input
            type="text"
            value={row[field]}
            onChange={(e) => handleCellEdit(rowIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingCell(null);
              if (e.key === 'Escape') {
                setData(initialData);
                setEditingCell(null);
              }
            }}
            autoFocus
            className={`w-full px-2 py-1 text-xs border rounded bg-gray-700 text-gray-100 ${
              hasError ? 'border-red-500' : 'border-red-500'
            }`}
          />
          {hasError && (
            <AlertCircle size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-red-400" />
          )}
        </div>
      );
    }

    if (field === 'Priority') {
      return (
        <div
          onClick={() => setEditingCell({ rowIndex, field })}
          className="cursor-pointer hover:opacity-80 px-2 py-1 rounded min-h-[24px] text-xs flex items-center justify-center"
        >
          <span className={`px-2 py-0.5 rounded font-semibold ${getPriorityColor(row[field])}`}>
            {row[field] || '-'}
          </span>
        </div>
      );
    }

    if (field === 'Difficulty') {
      return (
        <div
          onClick={() => setEditingCell({ rowIndex, field })}
          className="cursor-pointer hover:bg-gray-700/50 px-2 py-1 rounded min-h-[24px] text-xs flex items-center justify-center"
        >
          <span className={`font-semibold ${getDifficultyColor(row[field])}`}>
            {row[field] || '-'}
          </span>
        </div>
      );
    }

    return (
      <div
        onClick={() => setEditingCell({ rowIndex, field })}
        className="cursor-pointer hover:bg-gray-700/50 px-2 py-1 rounded min-h-[24px] text-xs flex items-center"
        title="Click to edit"
      >
        {row[field] || <span className="text-gray-600 italic">Empty</span>}
      </div>
    );
  };

  const headers: (keyof RequirementsRow)[] = [
    'Spec Category',
    'Parameter',
    'Symbol',
    'User Target Min',
    'User Target Typ',
    'User Target Max',
    'Units',
    'Priority',
    'Difficulty',
  ];

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Compact Action Bar */}
      {hasChanges && (
        <div className={`flex items-center justify-between px-4 py-2 border-b ${
          validationErrors.size > 0 
            ? 'bg-red-900/20 border-red-800' 
            : 'bg-red-900/20 border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-mono text-red-300 uppercase tracking-wider">
              {validationErrors.size > 0 
                ? `${validationErrors.size} Error${validationErrors.size > 1 ? 's' : ''}` 
                : 'Unsaved Changes'}
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
              disabled={validationErrors.size > 0}
              className="flex items-center gap-1 px-3 py-1 text-xs font-mono text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded transition-colors"
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
            Add Spec
          </button>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-gray-800 sticky top-0 z-10">
            <tr>
              <th className="border border-gray-700 px-2 py-2 text-left font-mono text-gray-300 w-8">#</th>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border border-gray-700 px-2 py-2 text-left font-mono text-gray-300"
                >
                  {header}
                </th>
              ))}
              <th className="border border-gray-700 px-2 py-2 text-center font-mono text-gray-300 w-12">
                Del
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`hover:bg-gray-800/50 ${getPriorityColor(row.Priority)} bg-opacity-20`}
              >
                <td className="border border-gray-800 px-2 py-1 text-center text-gray-500 font-mono">
                  {rowIndex + 1}
                </td>
                {headers.map((field) => (
                  <td
                    key={field}
                    className="border border-gray-800 text-gray-300"
                  >
                    {renderCell(
                      row,
                      rowIndex,
                      field,
                      editingCell?.rowIndex === rowIndex && editingCell?.field === field
                    )}
                  </td>
                ))}
                <td className="border border-gray-800 px-2 py-1 text-center">
                  <button
                    onClick={() => handleDeleteRow(rowIndex)}
                    className="p-1 text-red-500 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                    title="Delete row"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableRequirementsTable;