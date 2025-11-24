"use client"

import React, { useState, useEffect } from 'react';
import { FileCheck } from 'lucide-react';
import RequirementsModal from './RequirementsModal';
import { parseCSV } from '@/utils/csvParser';
import { shuffleArray, randomizeNumericValue, randomizePriority, randomizeDifficulty } from '@/utils/randomizeData';

interface RequirementsRow {
  'Spec Category': string;
  'Parameter': string;
  'Symbol': string;
  'Definition / Test Condition': string;
  'User Target Min': string;
  'User Target Typ': string;
  'User Target Max': string;
  'Actual Min': string;
  'Actual Typ': string;
  'Actual Max': string;
  'Units': string;
  'Physical Trade-off / Sensitivity': string;
  'Priority': string;
  'Difficulty': string;
  'Comments / Pin Mapping': string;
  'Specification Source': string;
  [key: string]: string; // Index signature to satisfy Record<string, string> constraint
}

interface RequirementsTabProps {
  csvFilePath?: string;
}

const RequirementsTab: React.FC<RequirementsTabProps> = ({ csvFilePath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [csvData, setCsvData] = useState<RequirementsRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Default CSV data (from the provided file)
  const defaultCSVData = `Spec Category,Parameter,Symbol,Definition / Test Condition,User Target Min,User Target Typ,User Target Max,Actual Min,Actual Typ,Actual Max,Units,Physical Trade-off / Sensitivity,Priority,Difficulty,Comments / Pin Mapping,Specification Source
DC Operating,VIN range,VIN_OP,VIN operating range over which all datasheet specifications are guaranteed,1.6,,6,,,,V,Higher VIN increases FET stress but improves dropout margin,H,M,Pin VIN; see Recommended Operating Conditions,User
DC Operating,VOUT range,VOUT_R,Nominal output voltage range supported by device options (fixed and adjustable),0.8,,5.5,,,,V,Wider programmable range increases divider mismatch sensitivity and trim complexity,H,M,Pin VOUT; includes fixed and adjustable variants,
DC Operating,ILOAD max,ILOAD,Maximum continuous output current over temperature,0,0.3,0.3,,,,A,"Higher ILOAD raises dissipation, requires larger pass FET area and better thermal paths",H,M,Referenced at VOUT(NOM) and TJ = -40 °C to 125 °C,
DC Operating,"Dropout @ ILOAD,max",VDROP,VIN - VOUT at ILOAD = 300 mA and VOUT ≥ 2.5 V (95% of VOUT(NOM)),0,,0.14,,,,V,Lower dropout requires larger pass FET area and/or higher gate overdrive headroom,H,L,Worst-case spec for 2.5 V ≤ VOUT < 5.5 V; use DBV/DSBGA limits as appropriate,
DC Operating,VOUT accuracy,VOUT_ACC,"Output voltage tolerance vs VOUT(NOM) over line, load, and temperature",,,,,,,%,"Tighter accuracy demands better bandgap, trim, and layout matching (extra area and test time)",H,M,"Applies over IOUT = 1–300 mA, VIN in range, TJ range per datasheet; ±1.5 % typical limit",
DC Operating,Line regulation,LINE_REG,ΔVOUT / ΔVIN from VOUT(NOM)+0.3 V to 6.0 V at IOUT = 1 mA,,0.03,,,,,%/V,"Improving line regulation requires increased loop gain or cascoding, which can raise IQ and complexity",M,M,Taken from Electrical Characteristics; TJ = 25 °C typical,
DC Operating,Load regulation,LOAD_REG,ΔVOUT from IOUT = 1 mA to 300 mA,,,0.015,,,,V,Better load regulation needs higher open-loop gain and good layout; increases sensitivity to stability margins,H,M,13 mV typ for DSBGA; spec target ≤ 15 mV,
DC Operating,Iq @ 0 mA,IQ_0%,"Quiescent ground current at VIN = 6 V, IOUT = 0 mA, VEN = VIN",6.5,8.5,15,,,,µA,Lower IQ improves battery life but limits available gm and loop bandwidth at light load,H,M,"From IGND spec: 6.5 µA typ, 15 µA max over full temperature",
DC Operating,Iq @ 10% ILOAD,IQ_10%,"Quiescent ground current at IOUT ≈ 30 mA, VIN = 6 V",,100,,,,,µA,Bias current may increase slightly to preserve bandwidth and PSRR at mid-load,H,M,Estimated from curves; define precise target from simulations,
DC Operating,Iq @ 100% ILOAD,IQ_100%,"Quiescent ground current at VIN = 6 V, IOUT = 300 mA",,2000,2000,,,,µA,Higher load current requires stronger gate drive; minimizing IQ here preserves efficiency but constrains PSRR and FBW,H,H,IGND spec shows ~2 mA typical at full load,
DC Operating,Input capacitance,CIN,Recommended minimum input capacitor for stable operation and good transient behavior,0.47,1,10,,,,µF,Larger CIN improves supply stability and reduces input ringing but increases inrush and cost,M,L,From Recommended Operating Conditions; ceramic capacitor assumed,
DC Operating,Output capacitance,COUT,Effective output capacitance required for stability,0.47,1,200,,,,µF,Larger COUT improves transient response but affects stability and startup behavior,H,H,From Recommended Operating Conditions; low-ESR ceramic assumed,
DC Operating,COUT ESR,ESR_COUT,Effective series resistance of output capacitor for stability,,,0.1,,,,Ω,Too low ESR can reduce zero contribution and affect phase margin; too high ESR degrades transient response,M,M,Use vendor capacitor ESR data at operating voltage and frequency,
Dynamic,FBW @ 1% ILOAD,FBW_1%,"Small-signal unity-gain bandwidth at ILOAD ≈ 1% of 300 mA (≈3 mA), nominal VIN",0.6,0.7,1,,,,MHz,"Increasing FBW at light load generally requires strengthening the error amplifier gm, which raises IQ at low ILOAD",H,M,Estimated from noise/PSRR roll-off; refine with AC simulation,
Dynamic,FBW @ 10% ILOAD,FBW_10%,"Small-signal unity-gain bandwidth at ILOAD ≈ 30 mA, nominal VIN",0.9,1,1.2,,,,MHz,Higher mid-load bandwidth improves PSRR and transient response but costs gm and area,H,M,Extracted from datasheet noise and PSRR plots; refine via AC analysis,
Dynamic,FBW @ 100% ILOAD,FBW_100%,"Small-signal unity-gain bandwidth at ILOAD = 300 mA, nominal VIN",1.1,1.2,1.4,,,,MHz,Pushing full-load bandwidth increases driver current and may stress phase margin with large COUT,H,H,High FBW at full load is key to TPS7A20-grade transient response,
Dynamic,"PSRR @ 1 kHz, 10% ILOAD",PSRR_LF_10%,"Power-supply rejection at 1 kHz with VIN ripple injected, ILOAD ≈ 30 mA",90,95,,,,,dB,"Improving low-frequency PSRR requires loop gain and good reference PSRR, increasing complexity and IQ",H,M,Feature spec: 95 dB at 1 kHz; use for reference loop targets,
Dynamic,"PSRR @ 100 kHz, 10% ILOAD",PSRR_MF_10%,"PSRR at 100 kHz, VIN ripple, ILOAD ≈ 30 mA",70,72,75,,,,dB,Mid-frequency PSRR is driven by compensation and gm; aggressive targets may constrain COUT and ESR,H,M,Derived from typical PSRR curves; refine with bench data,
Dynamic,"PSRR @ 1 kHz, 100% ILOAD",PSRR_LF_100%,"PSRR at 1 kHz, ILOAD = 300 mA",85,90,92,,,,dB,"Maintaining PSRR at high load needs strong loop gain and sufficient headroom, which may impact dropout and IQ",H,H,Based on typical characteristics; verify over full temperature,
Dynamic,"PSRR @ 100 kHz, 100% ILOAD",PSRR_MF_100%,"PSRR at 100 kHz, ILOAD = 300 mA",55,60,,,,,dB,"High-frequency PSRR heavily depends on layout, package inductance, and COUT ESR/ESL",H,H,Set as realistic target for TPS7A20-class performance,
Dynamic,Noise (10–100 kHz) @ 10% ILOAD,VNO_10%,Integrated output noise from 10 to 100 kHz at ILOAD ≈ 30 mA,0,7,8,,,,µV_rms,"Lower noise requires cleaner bandgap and larger filtering capacitors, increasing area and sometimes IQ",H,H,Feature spec lists 7 µV_RMS (typ) without noise-bypass capacitor,
Dynamic,Noise (10–100 kHz) @ 100% ILOAD,VNO_100%,Integrated output noise from 10 to 100 kHz at ILOAD = 300 mA,0,8,9,,,,µV_rms,Noise may rise slightly with load due to bandwidth and gm changes; meeting low noise at full load is demanding,H,H,Infer from typical noise plots; refine via simulation/measurement,
Protection,Current limit,ICL,Output current at which internal current limit engages (brick-wall type),0.36,0.5,0.77,,,,A,Higher limit improves overload drive but raises stress and short-circuit dissipation,H,M,Use datasheet min/typ/max ICL values as guidance,
Protection,Short-circuit current,ISC,Output current when VOUT is shorted to GND,0.12,0.16,0.2,,,,A,Lower ISC protects device and load but may affect startup into large capacitive loads,M,M,Based on typical short-circuit behavior curves,
Protection,UVLO rising threshold,VUVLO_RISE,VIN level at which device turns ON (UVLO rising),1.17,1.38,1.59,,,,V,Higher UVLO improves margin against brown-out but reduces usable input range,M,M,From switching characteristics; include hysteresis in design,
Protection,Thermal shutdown trip,TSD,Junction temperature at which device shuts down due to overtemperature,160,165,170,,,,°C,Lower TSD improves long-term reliability but risks nuisance trips in hot ambient,M,L,Auto-reset with hysteresis (reset ~140 °C typical),
Control,Startup time,TSTART,"Time from VEN high to VOUT within regulation at nominal VIN, COUT, and load",0.75,0.95,1.15,,,,ms,Faster startup increases inrush and may disturb upstream rails; slower startup improves stability but may violate system timing,M,M,From datasheet startup characteristics; adjust for application COUT and load,
Control,EN high threshold,VEN_HI,Minimum VEN recognized as logic high,0.9,1,1.2,,,,V,Higher VEN_HI improves noise immunity but may not be compatible with low-voltage logic,M,L,From electrical characteristics for EN pin,
Control,EN low threshold,VEN_LO,Maximum VEN recognized as logic low,0,0.3,0.4,,,,V,Lower VEN_LO ensures clean turn-off but may need careful system-level pull-down design,M,L,Used for logic interface to MCU or supervisor,
Reliability,Thermal resistance RθJA,RTHJA,Junction-to-ambient thermal resistance for selected package,,201.4,,,,,°C/W,Lower RθJA improves derating at high load but may require larger package or more copper area,M,M,From thermal table for DSBGA package,
Reliability,ESD rating (HBM),VESD_HBM,Human Body Model ESD robustness,2,2,2,,,,kV,Higher ESD robustness may increase pad capacitance and area,H,L,From ESD Ratings table,
Reliability,ESD rating (CDM),VESD_CDM,Charged Device Model ESD robustness,0.75,0.75,0.75,,,,kV,Higher CDM rating improves handling robustness at the cost of pad overhead,H,L,From ESD Ratings table,
Transient,"Load step-up undershoot (10→100% ILOAD,max)",VTR_LOAD_UP_DIP,"VOUT undershoot for ILOAD step 10%→100% of 300 mA, VIN nominal, COUT = 1 µF",0,0.04,0.06,,,,V,"Reducing undershoot requires higher bandwidth and/or larger COUT, raising IQ and area",H,H,Approximate from transient plots; refine with simulation and bench data,
Transient,Load step-up settling time to 0.2%,TSETTLE_LOAD_UP_0p2,Time for VOUT to settle within 0.2% of final value after 10%→100% ILOAD step,0,1,1.5,,,,µs,"Shorter settling time demands aggressive compensation and drive strength, impacting stability margins",H,H,Target aligned to TPS7A20-grade performance,
Transient,"Load step-down overshoot (100→10% ILOAD,max)",VTR_LOAD_DN_OVR,"VOUT overshoot for ILOAD step 100%→10% of 300 mA, VIN nominal, COUT = 1 µF",0,0.04,0.06,,,,V,Overshoot control requires careful damping and COUT choice; over-damping slows response,H,H,Extract from same transient scenario as load step-up,
Transient,Load step-down settling time to 0.2%,TSETTLE_LOAD_DN_0p2,Time for VOUT to settle within 0.2% after 100%→10% ILOAD step,0,1,1.5,,,,µs,Similar trade-offs as step-up settling; asymmetry reveals loop biasing behavior,H,H,Tune via transient simulation and lab measurement,
Transient,Line transient deviation (ΔVIN step),VTR_LINE_DEV,"VOUT deviation for ±1 V step on VIN at fixed ILOAD (e.g., 100 mA)",-0.03,0,0.03,,,,V,Improving line transient response requires good PSRR and supply decoupling at VIN,M-H,M,"Define ΔVIN, edge rate, and load explicitly in testbench",
Transient,Line transient settling time to 1%,TSETTLE_LINE_1%,Time for VOUT to settle within 1% after ΔVIN step,0,2,3,,,,µs,Shorter line settling time implies stronger supply rejection at relevant frequencies,M,M,Correlate with PSRR_MF targets,
Transient,Transient Figure of Merit (Vdip·COUT/ΔILOAD),TFOM,"TFOM = (Vdip × COUT) / ΔILOAD for worst-case load step (e.g., 10→100%)",0,150,200,,,,nC/A,"Lower TFOM indicates faster and more efficient transient energy delivery, but often requires higher gm and COUT",H,H,"Example: 60 mV dip, 1 µF COUT, 0.27 A step → ≈ 220 nC/A",
Transient,Current-Efficient Transient FOM (TFOM×IQ/ILOAD),CETFOM,"CETFOM = TFOM × (IQ / ILOAD), evaluated at full load step",0,1.5,5,,,,nC/A,Lower CETFOM indicates better transient behavior per unit bias current (efficiency-aware transient metric),H,H,"Example: TFOM ≈ 220 nC/A, IQ ≈ 2 mA, ILOAD = 300 mA → CETFOM ≈ 1.5 nC/A",
Decision,Decision Box 1,DEC_1,"Are all high-priority specs numerical, clearly defined, and mutually consistent with PDK, area, dropout, and IQ budgets?",,,,,,,,If No: adjust Step 0 (PDK/area) or Step 1 targets. If Yes: mark USCM as 'Step 1 Locked (v1.6)' and proceed to Step 2.,H,M,Top-level feasibility checkpoint before topology selection,`;

  useEffect(() => {
    const loadCSVData = async () => {
      if (csvFilePath) {
        setIsLoading(true);
        try {
          const response = await fetch(csvFilePath);
          const text = await response.text();
          let parsed = parseCSV<RequirementsRow>(text);
          // Randomize the data
          parsed = randomizeRequirementsData(parsed);
          setCsvData(parsed);
        } catch (error) {
          console.error('Error loading CSV:', error);
          // Fallback to default data
          let parsed = parseCSV<RequirementsRow>(defaultCSVData);
          parsed = randomizeRequirementsData(parsed);
          setCsvData(parsed);
        } finally {
          setIsLoading(false);
        }
      } else {
        // Use default data
        let parsed = parseCSV<RequirementsRow>(defaultCSVData);
        parsed = randomizeRequirementsData(parsed);
        setCsvData(parsed);
      }
    };

    loadCSVData();
  }, [csvFilePath]);

  // Function to randomize Requirements data
  const randomizeRequirementsData = (data: RequirementsRow[]): RequirementsRow[] => {
    // Shuffle the rows
    let randomized = shuffleArray(data);
    
    // Randomize numeric values, priorities, and difficulties
    randomized = randomized.map(row => ({
      ...row,
      'User Target Min': randomizeNumericValue(row['User Target Min'], 0.7, 1.3),
      'User Target Typ': randomizeNumericValue(row['User Target Typ'], 0.8, 1.2),
      'User Target Max': randomizeNumericValue(row['User Target Max'], 0.7, 1.3),
      'Actual Min': randomizeNumericValue(row['Actual Min'], 0.7, 1.3),
      'Actual Typ': randomizeNumericValue(row['Actual Typ'], 0.8, 1.2),
      'Actual Max': randomizeNumericValue(row['Actual Max'], 0.7, 1.3),
      'Priority': row.Priority ? randomizePriority() : row.Priority,
      'Difficulty': row.Difficulty ? randomizeDifficulty() : row.Difficulty,
    }));
    
    return randomized;
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200 text-sm font-medium text-gray-700"
        title="Requirements and Feasibility (USCM)"
      >
        <FileCheck size={18} className="text-red-600" />
        <span>Requirements</span>
      </button>

      <RequirementsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        csvData={csvData}
      />
    </>
  );
};

export default RequirementsTab;

