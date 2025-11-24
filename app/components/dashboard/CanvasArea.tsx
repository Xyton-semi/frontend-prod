import React, { useState, useEffect } from 'react';
import { PanelLeftClose, PanelRightClose, FileText, CheckCircle2 } from 'lucide-react';
import DataTabsContainer from './DataTabsContainer';
import PinBoundaryPanel from './PinBoundaryPanel';
import RequirementsPanel from './RequirementsPanel';
import PinBoundaryModal from './PinBoundaryModal';
import RequirementsModal from './RequirementsModal';
import { parseCSV } from '../../utils/csvParser';

interface CanvasAreaProps {
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (isOpen: boolean) => void;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (isOpen: boolean) => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ leftSidebarOpen, setLeftSidebarOpen, rightSidebarOpen, setRightSidebarOpen }) => {
    const [isReqOpen, setIsReqOpen] = useState(false);
    const [isPinOpen, setIsPinOpen] = useState(false);

    const [reqCsv, setReqCsv] = useState<Record<string, string>[]>([]);
    const [pinCsv, setPinCsv] = useState<Record<string, string>[]>([]);

    useEffect(() => {
        async function loadCSVs() {
            try {
                const [pinRes, reqRes] = await Promise.all([
                    fetch('/step0_pin_boundary.csv'),
                    fetch('/step1_requirements.csv')
                ]);

                if (pinRes.ok) {
                    const pinText = await pinRes.text();
                    setPinCsv(parseCSV(pinText));
                } else {
                    console.warn('Could not fetch pin/boundary CSV:', pinRes.status);
                }

                if (reqRes.ok) {
                    const reqText = await reqRes.text();
                    setReqCsv(parseCSV(reqText));
                } else {
                    console.warn('Could not fetch requirements CSV:', reqRes.status);
                }
            } catch (err) {
                console.error('Failed to load CSVs', err);
            }
        }

        loadCSVs();
    }, []);
    return (
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
            {/* Canvas Header */}
            <div className="h-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-4 justify-between shrink-0 z-10 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                    {!leftSidebarOpen && (
                        <button onClick={() => setLeftSidebarOpen(true)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                            <PanelLeftClose size={20} className="rotate-180" />
                        </button>
                    )}
                    <div className="flex items-center space-x-2 overflow-hidden flex-1">
                        <FileText size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        <span className="font-medium text-gray-700 dark:text-gray-200 truncate">Curvature-Compensated Bandgap (Brokaw-style)</span>
                        <span className="flex flex-shrink-0 items-center text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 size={12} className="mr-1" /> Auto-saved
                        </span>
                    </div>
                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                        <DataTabsContainer onOpenRequirements={() => setIsReqOpen(true)} onOpenPinBoundary={() => setIsPinOpen(true)} />
                                </div>
            </div>

                        {/* Modals for tab content */}
                        <RequirementsModal isOpen={isReqOpen} onClose={() => setIsReqOpen(false)} csvData={reqCsv as any} />
                        <PinBoundaryModal isOpen={isPinOpen} onClose={() => setIsPinOpen(false)} csvData={pinCsv as any} />

            {/* Canvas Content */}
            <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 relative cursor-grab active:cursor-grabbing transition-colors" style={{
              backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px), radial-gradient(#4b5563 1px, transparent 1px)',
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0, 0 0'
            }}>
                {/* Simplified Circuit SVG */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[80%] opacity-70 pointer-events-none">
                    <svg width="100%" height="100%" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#1f2937" />
                            </marker>
                        </defs>
                        <g stroke="#1f2937" strokeWidth="1.5" fill="none">
                            <path d="M 350 250 L 350 350 L 450 300 Z" fill="white"/>
                            <text x="380" y="305" stroke="none" fill="#1f2937" fontSize="14" fontWeight="bold">1495</text>
                            <path d="M 100 100 L 600 100" />
                            <path d="M 100 500 L 600 500" />
                            <path d="M 150 100 L 150 500" />
                            <path d="M 250 100 L 250 500" />
                            <path d="M 350 150 L 550 150" />
                            <circle cx="150" cy="200" r="20" fill="white" stroke="none"/>
                            <path d="M 150 180 L 150 220 M 130 200 L 170 200" />
                            <circle cx="250" cy="200" r="20" fill="white" stroke="none"/>
                            <path d="M 250 180 L 250 220 M 230 200 L 270 200" />
                            <path d="M 250 350 L 240 360 L 260 370 L 240 380 L 260 390 L 250 400" />
                            <path d="M 400 350 L 390 360 L 410 370 L 390 380 L 410 390 L 400 400" />
                            <circle cx="150" cy="100" r="3" fill="#1f2937" stroke="none"/>
                            <circle cx="250" cy="100" r="3" fill="#1f2937" stroke="none"/>
                            <circle cx="350" cy="300" r="3" fill="#1f2937" stroke="none"/>
                            <path d="M 450 300 L 550 300" markerEnd="url(#arrow)"/>
                            <path d="M 600 200 L 650 200" markerEnd="url(#arrow)"/>
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default CanvasArea;