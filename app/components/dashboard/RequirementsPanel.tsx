"use client"

import React, { useEffect, useState } from 'react';
import { parseCSV } from '@/utils/csvParser';
import { shuffleArray, randomizeNumericValue, randomizePriority, randomizeDifficulty } from '@/utils/randomizeData';

const defaultCSVData = `Spec Category,Parameter,Symbol,Definition / Test Condition,User Target Min,User Target Typ,User Target Max,Actual Min,Actual Typ,Actual Max,Units,Physical Trade-off / Sensitivity,Priority,Difficulty,Comments / Pin Mapping,Specification Source
DC Operating,VIN range,VIN_OP,VIN operating range over which all datasheet specifications are guaranteed,1.6,,6,,,,V,Higher VIN increases FET stress but improves dropout margin,H,M,Pin VIN; see Recommended Operating Conditions,User
DC Operating,VOUT range,VOUT_R,Nominal output voltage range supported by device options (fixed and adjustable),0.8,,5.5,,,,V,Wider programmable range increases divider mismatch sensitivity and trim complexity,H,M,Pin VOUT; includes fixed and adjustable variants,
DC Operating,ILOAD max,ILOAD,Maximum continuous output current over temperature,0,0.3,0.3,,,,A,"Higher ILOAD raises dissipation, requires larger pass FET area and better thermal paths",H,M,Referenced at VOUT(NOM) and TJ = -40 °C to 125 °C,
Decision,Decision Box 1,DEC_1,Are all high-priority specs numerical, clearly defined, and mutually consistent with PDK, area, dropout, and IQ budgets?,,,,,,,,If No: adjust Step 0 (PDK/area) or Step 1 targets. If Yes: mark USCM as 'Step 1 Locked (v1.6)' and proceed to Step 2.,H,M,Top-level feasibility checkpoint before topology selection,`;

const RequirementsPanel: React.FC<{ csvFilePath?: string }> = ({ csvFilePath }) => {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        let text = defaultCSVData;
        if (csvFilePath) {
          const res = await fetch(csvFilePath);
          text = await res.text();
        }
        let parsed = parseCSV(text);
        parsed = randomizeRequirementsData(parsed);
        setRows(parsed);
      } catch (err) {
        console.error(err);
        setRows(parseCSV(defaultCSVData));
      }
    };
    load();
  }, [csvFilePath]);

  const randomizeRequirementsData = (data: any[]) => {
    let randomized = shuffleArray(data);
    randomized = randomized.map(r => ({
      ...r,
      'User Target Min': randomizeNumericValue(r['User Target Min'], 0.9, 1.1),
      'User Target Typ': randomizeNumericValue(r['User Target Typ'], 0.9, 1.1),
      'User Target Max': randomizeNumericValue(r['User Target Max'], 0.9, 1.1),
      Priority: r.Priority ? randomizePriority() : r.Priority,
      Difficulty: r.Difficulty ? randomizeDifficulty() : r.Difficulty,
    }));
    return randomized;
  };

  return (
    <div className="w-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Requirements</h3>
        <div className="text-sm text-gray-500">{rows.length} rows</div>
      </div>

      <div className="p-4 overflow-auto max-h-[56vh]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Spec Category</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Parameter</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Symbol</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">User Target Min</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">User Target Typ</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">User Target Max</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Priority</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border border-gray-200 text-gray-700">{r['Spec Category']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-900">{r['Parameter']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{r['Symbol']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{r['User Target Min']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{r['User Target Typ']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{r['User Target Max']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{r['Priority']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{r['Difficulty']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RequirementsPanel;
