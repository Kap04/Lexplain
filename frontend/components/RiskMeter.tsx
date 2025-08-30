// components/RiskMeter.tsx  (only modified bits shown in full file)
import React from 'react';

interface RiskMeterProps {
  riskScore: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showScore?: boolean;
  className?: string;
}

export default function RiskMeter({
  riskScore,
  size = 'medium',
  showLabel = true,
  showScore = true,
  className = ''
}: RiskMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(riskScore)));

  const sizeConfig = {
    small: { radius: 50, stroke: 16, font: 12, label: 10 },
    medium: { radius: 70, stroke: 20, font: 16, label: 12 },
    large: { radius: 90, stroke: 24, font: 20, label: 14 }
  } as const;

  const { radius, stroke: strokeWidth, font: fontSize, label: labelSize } =
    sizeConfig[size];

  const center = radius + strokeWidth / 2 + 20;
  const svgSize = center * 2;

  // ----- CHANGES HERE -----
  // Use π -> 2π so arc goes over the top (not below)
  const startAngle = Math.PI;      // 180deg = left
  const endAngle = 2 * Math.PI;    // 360deg = same as 0, but approaches via the top
  const angleRange = endAngle - startAngle; // PI (180deg)

  // Convert score to angle (increase from left -> right going over the top)
  const scoreToAngle = (score: number) => {
    return startAngle + (score / 100) * angleRange;
  };
  // -------------------------
  

  const needleAngle = scoreToAngle(clamped);

  // segment boundaries
  const p1 = 33, p2 = 67;
  const lowEnd = scoreToAngle(p1);
  const medEnd = scoreToAngle(p2);

const segments = [
    { from: 0, to: p1, color: '#22C55E' }, // green
    { from: p1, to: p2, color: '#F59E0B' }, // orange
    { from: p2, to: 100, color: '#EF4444' } // red
  ];
  

  // Helper to convert angle to x,y coordinates
  const angleToPoint = (angle: number, r: number) => ({
    x: center + r * Math.cos(angle),
    y: center + r * Math.sin(angle)
  });

  const leftCapPoint = angleToPoint(startAngle, radius);
  const rightCapPoint = angleToPoint(endAngle, radius);

  // Create path for arc segment — set sweepFlag = 1 (draw forward direction)
  const createArcPath = (a0: number, a1: number, r: number) => {
    const start = angleToPoint(a0, r);
    const end = angleToPoint(a1, r);
    const diff = Math.abs(a1 - a0);
    const largeArcFlag = diff > Math.PI ? 1 : 0;
    const sweepFlag = 1; // draw the arc in the forward (increasing-angle) direction
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
  };

//   // Define segments (percent -> angles)
//   const lowEnd = scoreToAngle(33);
//   const medEnd = scoreToAngle(67);

  // Get current risk level
  const getRiskLevel = (score: number) => {
    if (score <= 33) return { label: 'LOW', color: '#22C55E' };
    if (score <= 67) return { label: 'MEDIUM', color: '#F59E0B' };
    return { label: 'HIGH', color: '#EF4444' };
  };
  
  const { label: levelLabel, color: levelColor } = getRiskLevel(clamped);

  // Needle tip position
  const needleTip = angleToPoint(needleAngle, radius - 10);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={svgSize} height={center + 25} className="overflow-visible">
        
        {/* Low segment (green) */}
        <path
          d={createArcPath(startAngle, lowEnd, radius)}
          fill="none"
          stroke={segments[0].color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Medium segment (yellow) */}
        <path
          d={createArcPath(lowEnd, medEnd, radius)}
          fill="none"
          stroke={segments[1].color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />
        
        {/* High segment (red) */}
        <path
          d={createArcPath(medEnd, endAngle, radius)}
          fill="none"
          stroke={segments[2].color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />

        {/* Needle */}
        <line
          x1={center}
          y1={center}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="#1F2937"
          strokeWidth={3}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={6}
          fill="#1F2937"
        />
         {/* Outer circular caps last (so they sit above the orange overlap) */}
        <circle cx={leftCapPoint.x} cy={leftCapPoint.y} r={strokeWidth / 2} fill={segments[0].color} />
        <circle cx={rightCapPoint.x} cy={rightCapPoint.y} r={strokeWidth / 2} fill={segments[2].color} />

        {/* Labels */}
        <text
          x={angleToPoint(startAngle, radius + 15).x}
          y={angleToPoint(startAngle, radius + 15).y + 25}
          fontSize={labelSize}
          fontWeight="600"
          fill="#22C55E"
          textAnchor="middle"
        >
          LOW
        </text>

        <text
          x={angleToPoint(endAngle, radius + 15).x}
          y={angleToPoint(endAngle, radius + 15).y  + 25}
          fontSize={labelSize}
          fontWeight="600"
          fill="#EF4444"
          textAnchor="middle"
        >
          HIGH
        </text>
      </svg>

      {/* Score display */}
      {(showLabel || showScore) && (
        <div className="text-center ">
          {showScore && (
            <div className="text-gray-700 font-medium" style={{ fontSize: `${fontSize}px` }}>
              {clamped}/100
            </div>
          )}
          {showLabel && (
            <div className="font-bold" style={{ color: levelColor, fontSize: `${fontSize}px` }}>
              {levelLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}




