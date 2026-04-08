'use client'

import { useState } from 'react'
import { PIPELINE_STAGES } from '@/lib/constants'
import type { PipelineStage } from '@/types/database'

interface Lead {
  id: string
  company_name: string
  stage: PipelineStage
  isStuck: boolean
  daysInStage: number
}

interface LeadJourneyProps {
  leads: Lead[]
}

export function LeadJourney({ leads }: LeadJourneyProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Get stage position (0-7)
  const getStagePosition = (stage: PipelineStage): number => {
    return PIPELINE_STAGES.findIndex(s => s.value === stage)
  }

  // Limit to first 50 leads for performance
  const displayedLeads = leads.slice(0, 50)
  const hiddenCount = leads.length - displayedLeads.length

  return (
    <div className="rounded-xl border border-gray-200 dark:border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Lead Journey Pipeline</h2>
          <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">
            {displayedLeads.length} leads
            {hiddenCount > 0 && ` (${hiddenCount} more)`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="relative size-3">
              <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-emerald-400" style={{ animationDuration: '2s' }} />
              <div className="relative rounded-full size-2.5 bg-emerald-500" />
            </div>
            <span className="text-gray-600 dark:text-muted-foreground">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative size-3">
              <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-red-400" style={{ animationDuration: '2s' }} />
              <div className="relative rounded-full size-2.5 bg-red-500" />
            </div>
            <span className="text-gray-600 dark:text-muted-foreground">Stuck</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header with stage labels */}
          <div className="flex gap-1 mb-2">
            <div className="w-32 flex-shrink-0" />
            {PIPELINE_STAGES.map((stage, idx) => (
              <div
                key={stage.value}
                className="flex-1 min-w-[120px] px-2 text-center"
              >
                <p className="text-xs font-semibold text-gray-600 dark:text-muted-foreground">
                  {stage.label}
                </p>
              </div>
            ))}
          </div>

          {/* Journey lines for each lead */}
          <div className="space-y-2">
            {displayedLeads.map((lead, leadIdx) => {
              const stagePos = getStagePosition(lead.stage as PipelineStage)
              const stagePercentage = (stagePos / (PIPELINE_STAGES.length - 1)) * 100

              return (
                <div key={lead.id} className="flex gap-1 items-center group">
                  {/* Lead name */}
                  <div className="w-32 flex-shrink-0 pr-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-foreground truncate group-hover:text-primary transition-colors">
                      {lead.company_name}
                    </p>
                  </div>

                  {/* Journey line */}
                  <div className="flex-1 min-w-[600px] relative h-6 bg-gradient-to-r from-gray-50/50 dark:from-card/50 to-gray-100/50 dark:to-border/50 rounded-full border border-gray-200 dark:border-border/50 overflow-hidden">
                    {/* Background line */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-gray-300 dark:from-border via-gray-300 dark:via-border to-gray-300 dark:to-border transform -translate-y-1/2" />

                    {/* Stage markers */}
                    <div className="absolute inset-0 flex items-center justify-between px-2">
                      {PIPELINE_STAGES.map((stage, idx) => (
                        <div
                          key={stage.value}
                          className="flex-1 flex justify-center"
                        >
                          <div className="size-2 rounded-full bg-gray-400 dark:bg-muted border border-white dark:border-card z-10" />
                        </div>
                      ))}
                    </div>

                    {/* Blinking dot at current stage */}
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 z-20"
                      style={{ left: `${stagePercentage}%` }}
                      onMouseEnter={() => setHoveredId(lead.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Outer pulsing ring */}
                      <div
                        className={`absolute rounded-full animate-ping ${
                          lead.isStuck ? 'bg-red-400' : 'bg-emerald-400'
                        }`}
                        style={{
                          width: '16px',
                          height: '16px',
                          left: '-3px',
                          top: '-3px',
                          animationDelay: `${leadIdx * 0.1}s`,
                          animationDuration: '2s',
                        }}
                      />

                      {/* Inner solid dot */}
                      <div
                        className={`relative rounded-full size-2.5 border-2 border-white dark:border-card transition-all cursor-pointer ${
                          lead.isStuck
                            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
                            : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/50'
                        }`}
                      />

                      {/* Tooltip */}
                      {hoveredId === lead.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 whitespace-nowrap bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg px-3 py-2 z-50 pointer-events-none shadow-lg border border-gray-700 dark:border-gray-600">
                          <p className="font-semibold">{lead.company_name}</p>
                          <p className="text-emerald-300">{PIPELINE_STAGES[stagePos]?.label}</p>
                          <p className="text-gray-400">{lead.daysInStage} days in stage</p>
                          {lead.isStuck && (
                            <p className="text-red-400 font-medium mt-1">⚠️ Stuck for {lead.daysInStage} days</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {hiddenCount > 0 && (
              <div className="text-xs text-gray-500 dark:text-muted-foreground py-2 px-3">
                + {hiddenCount} more leads
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
