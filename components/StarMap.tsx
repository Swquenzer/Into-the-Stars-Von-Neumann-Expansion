
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { GameState, SolarSystem, Probe, ProbeState } from '../types';
import { UNIVERSE_WIDTH, UNIVERSE_HEIGHT } from '../constants';

interface StarMapProps {
  gameState: GameState;
  onSystemSelect: (id: string) => void;
  onProbeSelect: (id: string) => void;
}

export const StarMap: React.FC<StarMapProps> = ({ gameState, onSystemSelect, onProbeSelect }) => {
  const { systems, probes, selectedSystemId, selectedProbeId } = gameState;

  // Viewport State
  const [viewState, setViewState] = useState({ x: 0, y: 0, zoom: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef<{ x: number, y: number } | null>(null);

  // Auto-center on selected probe
  useEffect(() => {
    if (selectedProbeId) {
      const probe = probes.find(p => p.id === selectedProbeId);
      if (probe) {
        setViewState(prev => ({
          ...prev,
          x: probe.position.x - (UNIVERSE_WIDTH / 2),
          y: probe.position.y - (UNIVERSE_HEIGHT / 2)
        }));
      }
    }
    // Dependency on selectedProbeId ensures this only runs when selection changes, 
    // avoiding a "lock-on" camera effect during movement.
  }, [selectedProbeId]);

  // -- Interaction Handlers --

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    const newZoom = Math.min(Math.max(viewState.zoom * (1 + delta), 0.1), 5);
    setViewState(prev => ({ ...prev, zoom: newZoom }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && lastMousePos.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setViewState(prev => ({
        ...prev,
        x: prev.x - (dx / prev.zoom),
        y: prev.y - (dy / prev.zoom)
      }));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    lastMousePos.current = null;
  };

  // -- Render Calculations --

  const visibleSystems = useMemo(() => {
    return systems.filter(s => s.discovered || s.visited);
  }, [systems]);

  const renderConnectionLines = useMemo(() => {
    return probes.map(probe => {
      if (probe.state === ProbeState.Traveling && probe.targetSystemId && probe.locationId) {
        const startSys = systems.find(s => s.id === probe.locationId);
        const endSys = systems.find(s => s.id === probe.targetSystemId);
        
        // Only draw line if systems are valid. We draw even if destination is not discovered yet (it's being discovered)
        if (startSys && endSys) {
             return (
            <line
              key={`path-${probe.id}`}
              x1={startSys.position.x}
              y1={startSys.position.y}
              x2={endSys.position.x}
              y2={endSys.position.y}
              stroke="#1e293b"
              strokeWidth="2"
              strokeDasharray="10,10"
            />
          );
        }
      }
      return null;
    });
  }, [probes, systems]);

  const renderExplorationVectors = useMemo(() => {
      return probes.map(probe => {
          if (probe.state === ProbeState.Exploring && probe.heading !== undefined) {
              const rad = (probe.heading * Math.PI) / 180;
              const length = 200; // Visual length of the vector
              const x2 = probe.position.x + Math.cos(rad) * length;
              const y2 = probe.position.y + Math.sin(rad) * length;

              return (
                  <line 
                    key={`vector-${probe.id}`}
                    x1={probe.position.x}
                    y1={probe.position.y}
                    x2={x2}
                    y2={y2}
                    stroke="#10b981"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    opacity="0.5"
                  />
              )
          }
          return null;
      });
  }, [probes]);

  const renderScannerRadii = useMemo(() => {
    return probes.map(probe => {
        if (probe.state === ProbeState.Scanning) {
            return (
                <circle 
                    key={`scan-${probe.id}`}
                    cx={probe.position.x}
                    cy={probe.position.y}
                    r={probe.stats.scanRange}
                    fill="none"
                    stroke="#6366f1" // Indigo
                    strokeWidth="1"
                    strokeOpacity="0.5"
                    className="animate-pulse"
                />
            )
        } else if (probe.state === ProbeState.Exploring) {
             return (
                <circle 
                    key={`explore-scan-${probe.id}`}
                    cx={probe.position.x}
                    cy={probe.position.y}
                    r={50} // Passive Scan Range
                    fill="none"
                    stroke="#10b981" // Emerald
                    strokeWidth="1"
                    strokeOpacity="0.3"
                />
            )
        }
        return null;
    })
  }, [probes]);

  // Calculate ViewBox
  const viewBoxWidth = UNIVERSE_WIDTH / viewState.zoom;
  const viewBoxHeight = UNIVERSE_HEIGHT / viewState.zoom;
  const vbX = (UNIVERSE_WIDTH / 2) + viewState.x - (viewBoxWidth / 2);
  const vbY = (UNIVERSE_HEIGHT / 2) + viewState.y - (viewBoxHeight / 2);
  
  const viewBox = `${vbX} ${vbY} ${viewBoxWidth} ${viewBoxHeight}`;

  return (
    <div 
      className="w-full h-full bg-slate-950 overflow-hidden relative border-r border-slate-800"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg 
        viewBox={viewBox} 
        className="w-full h-full object-contain cursor-move"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="1" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background Grid */}
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
        </pattern>
        <rect x={vbX} y={vbY} width={viewBoxWidth} height={viewBoxHeight} fill="url(#grid)" opacity="0.2" />

        {/* Scanner Radii (Underneath) */}
        {renderScannerRadii}

        {/* Flight Paths */}
        {renderConnectionLines}
        {renderExplorationVectors}

        {/* Systems */}
        {visibleSystems.map((system) => {
          const isSelected = selectedSystemId === system.id;
          const isEarth = system.name === 'Earth';
          const radius = isEarth ? 25 : 15;
          const color = isEarth ? '#3b82f6' : (system.visited ? '#fbbf24' : '#64748b');
          
          return (
            <g 
              key={system.id} 
              onClick={(e) => { e.stopPropagation(); onSystemSelect(system.id); }}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <circle
                cx={system.position.x}
                cy={system.position.y}
                r={radius + (isSelected ? 5 : 0)}
                fill={color}
                opacity="0.2"
                className="animate-pulse"
              />
              <circle
                cx={system.position.x}
                cy={system.position.y}
                r={radius / 2}
                fill={color}
                stroke={isSelected ? '#fff' : 'none'}
                strokeWidth="2"
              />
              <text
                x={system.position.x}
                y={system.position.y + 35}
                fill="#94a3b8"
                fontSize="20"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                {system.name}
              </text>
            </g>
          );
        })}

        {/* Probes */}
        {probes.map((probe) => {
          const isSelected = selectedProbeId === probe.id;
          return (
            <g
              key={probe.id}
              transform={`translate(${probe.position.x}, ${probe.position.y})`}
              onClick={(e) => {
                e.stopPropagation();
                onProbeSelect(probe.id);
              }}
              className="cursor-pointer" 
            >
              {isSelected && (
                <circle r="15" fill="none" stroke="#22d3ee" strokeWidth="2" className="animate-spin-slow" strokeDasharray="4 4" />
              )}
              
              <circle r="6" fill={probe.state === ProbeState.Traveling ? '#ef4444' : probe.state === ProbeState.Exploring ? '#10b981' : '#10b981'} />
              
              {(probe.state === ProbeState.MiningMetal || probe.state === ProbeState.MiningPlutonium) && (
                <path transform="translate(-3, -15)" fill="#e2e8f0" d="M3 0L6 10H0L3 0Z" />
              )}
              
              {/* Radar Icon for scanning state */}
               {probe.state === ProbeState.Scanning && (
                   <circle r="20" fill="none" stroke="#6366f1" strokeWidth="1" className="animate-ping" />
               )}

            </g>
          );
        })}
      </svg>
      
      {/* Overlay info */}
      <div className="absolute top-4 left-4 text-slate-500 text-sm pointer-events-none select-none bg-slate-900/80 p-2 rounded backdrop-blur-sm border border-slate-800">
        <div>Systems Detected: {visibleSystems.length} / {systems.length}</div>
        <div>Zoom: {viewState.zoom.toFixed(1)}x</div>
        <div className="text-xs opacity-70 mt-1">Drag to Pan • Scroll to Zoom</div>
      </div>
    </div>
  );
};
