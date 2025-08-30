// pages/risk-meter-demo.tsx
"use client";
import React, { useState } from 'react';
import RiskMeter from '../components/RiskMeter';

export default function RiskMeterDemo() {
  const [riskScore, setRiskScore] = useState(65);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Risk Meter Component Demo
        </h1>
        
        {/* Interactive Control */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Interactive Demo</h2>
          <div className="flex items-center gap-4 mb-6">
            <label htmlFor="risk-slider" className="font-medium">Risk Score:</label>
            <input
              id="risk-slider"
              type="range"
              min="0"
              max="100"
              value={riskScore}
              onChange={(e) => setRiskScore(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="font-bold text-lg w-16">{riskScore}</span>
          </div>
          
          <div className="flex justify-center">
            <RiskMeter 
              riskScore={riskScore} 
              size="large" 
              showLabel={true}
              showScore={true}
            />
          </div>
        </div>

        {/* Size Variations */}
        <div className="bg-white rounded-lg p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Size Variations</h2>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="font-medium mb-4">Small</h3>
              <RiskMeter riskScore={25} size="small" />
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4">Medium</h3>
              <RiskMeter riskScore={55} size="medium" />
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4">Large</h3>
              <RiskMeter riskScore={85} size="large" />
            </div>
          </div>
        </div>

        {/* Risk Level Examples */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Risk Level Examples</h2>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="font-medium mb-4 text-green-600">Low Risk (15/100)</h3>
              <RiskMeter riskScore={15} size="medium" />
              <p className="text-sm text-gray-600 mt-2">
                Minimal legal concerns identified
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4 text-yellow-600">Medium Risk (65/100)</h3>
              <RiskMeter riskScore={65} size="medium" />
              <p className="text-sm text-gray-600 mt-2">
                Some areas require attention
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4 text-red-600">High Risk (90/100)</h3>
              <RiskMeter riskScore={90} size="medium" />
              <p className="text-sm text-gray-600 mt-2">
                Significant legal concerns found
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="bg-white rounded-lg p-6 mt-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Configuration Options</h2>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="font-medium mb-4">Label Only</h3>
              <RiskMeter riskScore={75} size="medium" showLabel={true} showScore={false} />
            </div>
            <div className="text-center">
              <h3 className="font-medium mb-4">Score Only</h3>
              <RiskMeter riskScore={45} size="medium" showLabel={false} showScore={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
