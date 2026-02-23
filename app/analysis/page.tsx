"use client";

import { useState } from 'react';
import { AnalysisHeader } from '@/components/analysis/analysis-header';
import { RecordingInterface } from '@/components/analysis/recording-interface';
import { AIProcessingVisualizer } from '@/components/analysis/ai-processing-visualizer';
import { ResultsDisplay } from '@/components/analysis/results-display';
import { RecommendationsPanel } from '@/components/analysis/recommendations-panel';

export default function AnalysisPage() {
  const [analysisType, setAnalysisType] = useState<'heart' | 'lungs'>('heart');

  return (
    <div className="container mx-auto px-4 py-8">
      <AnalysisHeader analysisType={analysisType} onAnalysisTypeChange={setAnalysisType} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="space-y-8">
          <RecordingInterface analysisType={analysisType} />
          <AIProcessingVisualizer />
        </div>
        <div className="space-y-8">
          <ResultsDisplay analysisType={analysisType} />
          <RecommendationsPanel analysisType={analysisType} />
        </div>
      </div>
    </div>
  );
}