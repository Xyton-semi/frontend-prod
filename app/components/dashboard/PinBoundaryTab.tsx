"use client"

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import PinBoundaryModal from './PinBoundaryModal';
import { parseCSV, type CSVRow } from '@/utils/csvParser';
import { shuffleArray, randomizeNumericValue, randomizeBoolean } from '@/utils/randomizeData';

interface PinBoundaryTabProps {
  csvFilePath?: string;
}

const PinBoundaryTab: React.FC<PinBoundaryTabProps> = ({ csvFilePath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Default CSV data (from the provided file)
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

  useEffect(() => {
    const loadCSVData = async () => {
      if (csvFilePath) {
        setIsLoading(true);
        try {
          const response = await fetch(csvFilePath);
          const text = await response.text();
          // Explicitly type the parser to return CSVRow[]
          let parsed = parseCSV<CSVRow>(text);
          // Randomize the data
          parsed = randomizePinBoundaryData(parsed);
          setCsvData(parsed);
        } catch (error) {
          console.error('Error loading CSV:', error);
          // Fallback to default data with explicit typing
          let parsed = parseCSV<CSVRow>(defaultCSVData);
          parsed = randomizePinBoundaryData(parsed);
          setCsvData(parsed);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Use default data with explicit typing
        let parsed = parseCSV<CSVRow>(defaultCSVData);
        parsed = randomizePinBoundaryData(parsed);
        setCsvData(parsed);
      }
    };

    loadCSVData();
  }, [csvFilePath]);

  // Function to randomize Pin & Boundary data
  const randomizePinBoundaryData = (data: CSVRow[]): CSVRow[] => {
    // Shuffle the rows
    let randomized = shuffleArray(data);
    
    // Randomize numeric values and boolean fields
    randomized = randomized.map(row => ({
      ...row,
      VoltageMin: randomizeNumericValue(row.VoltageMin, 0.7, 1.3),
      VoltageMax: randomizeNumericValue(row.VoltageMax, 0.7, 1.3),
      ESD_HBM_kV: randomizeNumericValue(row.ESD_HBM_kV, 0.8, 1.2),
      ESD_CDM_V: randomizeNumericValue(row.ESD_CDM_V, 0.8, 1.2),
      Value: randomizeNumericValue(row.Value, 0.7, 1.3),
      PadConn: randomizeBoolean(),
    }));
    
    return randomized;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200 text-sm font-medium text-gray-700"
        title="Pin and Boundary Definition"
      >
        <FileSpreadsheet size={18} className="text-red-600" />
        <span>Pin & Boundary</span>
      </button>

      <PinBoundaryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        csvData={csvData}
      />
    </>
  );
};

export default PinBoundaryTab;