import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, Download } from 'lucide-react';

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

const EditablePinBoundaryTable: React.FC<EditablePinBoundaryTableProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [data, setData] = useState<PinBoundaryRow[]>(initialData);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleCellEdit = (rowIndex: number, field: keyof PinBoundaryRow, value: string) => {
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [field]: value };
    setData(newData);
    setHasChanges(true);
  };

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
    const newData = data.filter((_, index) => index !== rowIndex);
    setData(newData);
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

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pin_boundary_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
          onBlur={() => setEditingCell(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setEditingCell(null);
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
      <div
        onClick={() => setEditingCell({ rowIndex, field })}
        className="cursor-pointer hover:bg-gray-700/50 px-2 py-1 rounded min-h-[24px] text-xs flex items-center"
        title="Click to edit"
      >
        {row[field] || <span className="text-gray-600 italic">Empty</span>}
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
            Add Row
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
                  {headerLabels[header]}
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
                className={`hover:bg-gray-800/50 ${getRowTypeColor(row.RowType)}`}
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

export default EditablePinBoundaryTable;