"use client"

import React, { useEffect, useState } from 'react';
import { parseCSV } from '@/utils/data';
import { shuffleArray, randomizeNumericValue, randomizeBoolean } from '@/utils/data';

const defaultCSVData = `RowType,Name,PadConn,Direction,Function,Definition / Notes,VoltageMin,VoltageMax,Units,ESD_HBM_kV,ESD_CDM_V,Value,ValueUnits,Comments
Pin,VIN,Y,Input,Input supply to LDO,Recommended operating range from datasheet ROC table,1.6,6,V,2,0.75,,,Also see Absolute Maximum Ratings: -0.3 V to 6.5 V
Pin,VOUT,Y,Output,Regulated output node,Nominal output voltage range from datasheet ROC table,0.8,5.5,V,2,0.75,,,"VOUT abs max limited to min(6.5 V, VIN + 0.3 V)"
Pin,EN,Y,Input,Enable control input,Digital / logic-compatible enable pin,0,6,V,2,0.75,,,Internal 500 kΩ pulldown to GND when VEN < VEN(HI)
Pin,GND,Y,Bidirectional (return),Circuit return,Reference node for all voltages,0,0,V,,,,,Kelvin return handled later in Step 7 (layout)
Boundary,Package type,,,,Selected small-outline DSBGA for area-driven LDO,,,,,,YCK 4-ball DSBGA,–,0.616 mm × 0.616 mm package footprint
Boundary,Usable die area,,,,80% of package area used as first-pass die-area budget,,,,,,0.38,mm²,Effective silicon budget ≈ 0.38 mm²
Boundary,PDK node,,,,Assumed automotive-capable BCD process with precision poly + MIM caps,,,,,,130 nm,m,130 nm BCD with Hi-Res poly and MIM capacitors
Boundary,Thermal resistance RθJA,,,,From datasheet thermal table for DSBGA package,,,,,,201.4,°C/W,Use this for first-pass junction temperature estimates
Boundary,ESD rating,,,,"Datasheet ESD ratings (HBM, CDM)",,,,2,0.75,,,"2 kV HBM, 750 V CDM typical"
Decision,Decision Box 0,,,,Are all external pins and pad connections defined and mapped to the PDK pad library?,,,,,,,,If No: complete pin list or ESD targets. If Yes: proceed to Step 1.`;

type ParsedRow = Record<string, string>;

const PinBoundaryPanel: React.FC<{ csvFilePath?: string }> = ({ csvFilePath }) => {
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        let text = defaultCSVData;
        if (csvFilePath) {
          const res = await fetch(csvFilePath);
          text = await res.text();
        }
        let parsed = parseCSV<ParsedRow>(text);
        parsed = randomizePinBoundaryData(parsed);
        setCsvData(parsed);
      } catch (err) {
        console.error(err);
        const parsed = parseCSV<ParsedRow>(defaultCSVData);
        setCsvData(parsed);
      }
    };
    load();
  }, [csvFilePath]);

  const randomizePinBoundaryData = (data: ParsedRow[]): ParsedRow[] => {
    let randomized = shuffleArray(data);
    randomized = randomized.map(row => ({
      ...row,
      VoltageMin: randomizeNumericValue(row['VoltageMin'], 0.9, 1.1),
      VoltageMax: randomizeNumericValue(row['VoltageMax'], 0.9, 1.1),
      ESD_HBM_kV: randomizeNumericValue(row['ESD_HBM_kV'], 0.9, 1.1),
      ESD_CDM_V: randomizeNumericValue(row['ESD_CDM_V'], 0.9, 1.1),
      Value: randomizeNumericValue(row['Value'], 0.9, 1.1),
      PadConn: randomizeBoolean() ? 'Y' : 'N',
    }));
    return randomized;
  };

  const getRowTypeColor = (rowType: string) => {
    switch (rowType?.toLowerCase()) {
      case 'pin':
        return 'bg-blue-50 border-blue-200';
      case 'boundary':
        return 'bg-green-50 border-green-200';
      case 'decision':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-white border-gray-100';
    }
  };

  return (
    <div className="w-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Pin & Boundary</h3>
        <div className="text-sm text-gray-500">{csvData.length} rows</div>
      </div>

      <div className="p-4 overflow-auto max-h-[56vh]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Row Type</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Name</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">PadConn</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Direction</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Function</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Voltage Min</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Voltage Max</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Units</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">Comments</th>
              </tr>
            </thead>
            <tbody>
              {csvData.map((row, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${getRowTypeColor(row['RowType'])} border`}> 
                  <td className="px-3 py-2 border border-gray-200 font-medium text-gray-700">{row['RowType']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-900">{row['Name']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{row['PadConn']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{row['Direction']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{row['Function']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{row['VoltageMin']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{row['VoltageMax']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{row['Units']}</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-600">{row['Comments']}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PinBoundaryPanel;
