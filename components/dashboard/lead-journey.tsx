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

  // Group leads by stage
  const leadsByStage = PIPELINE_STAGES.reduce<Record<string, Lead[]>>((acc, s) => {
    acc[s.value] = leads.filter(l => l.stage === s.value)
    return acc
  }, {} as Record<string, Lead[]>)

  // Separate completed/churned (show differently) from active pipeline
  const isActiveStage = (stage: PipelineStage) => stage !== 'completed' && stage !== 'churned'

  return (
    <div className="rounded-xl border border-gray-200 dark:border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-foreground">Lead Journey Pipeline</h2>
        <span className="text-xs text-gray-400 dark:text-muted-foreground">{leads.length} active leads</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1200px] space-y-4">
          {/* Pipeline line with stages */}
          <div className="relative h-24 bg-gradient-to-r from-gray-50 dark:from-card to-gray-100 dark:to-border rounded-lg border border-gray-100 dark:border-border/50 p-4">
            {/* Connecting line */}
            <div className="absolute top-12 left-0 right-0 h-0.5 bg-gray-300 dark:bg-border"></div>

            {/* Stage nodes */}
            <div className="relative h-full flex items-center justify-between px-2">
              {PIPELINE_STAGES.map((stage, idx) => (
                <div key={stage.value} className="flex flex-col items-center gap-1">
                  {/* Stage dot on the line */}
                  <div className={`size-3 rounded-full border-2 border-white dark:border-card z-10 ${stage.color.split(' ')[0]}`}></div>

                  {/* Stage label */}
                  <p className="text-xs font-medium text-gray-600 dark:text-muted-foreground text-center max-w-[80px] leading-tight">
                    {stage.label}
                  </p>

                  {/* Lead count badge */}
                  {leadsByStage[stage.value].length > 0 && (
                    <span className="text-xs font-semibold text-gray-700 dark:text-foreground bg-gray-200/50 dark:bg-muted px-1.5 py-0.5 rounded">
                      {leadsByStage[stage.value].length}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dots section - all stages */}
          <div className="relative h-32">
            <div className="flex justify-between h-full">
              {PIPELINE_STAGES.map((stage) => {
                const stageLeads = leadsByStage[stage.value] || []
                const MAX_VISIBLE = 12
                const overflow = stageLeads.length > MAX_VISIBLE

                return (
                  <div key={stage.value} className="flex-1 flex flex-col items-center gap-1 min-w-[120px]">
                    {/* Dots grid for this stage */}
                    <div className="flex flex-wrap gap-1.5 justify-center">
                      {stageLeads.slice(0, MAX_VISIBLE).map((lead, idx) => (
                        <div
                          key={lead.id}
                          className="relative group cursor-pointer"
                          onMouseEnter={() => setHoveredId(lead.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          {/* Outer pulsing ring */}
                          <div
                            className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                              lead.isStuck ? 'bg-red-400' : 'bg-emerald-400'
                            }`}
                            style={{
                              animationDelay: `${idx * 0.15}s`,
                              animationDuration: '2s',
                            }}
                          />

                          {/* Inner solid dot */}
                          <div
                            className={`relative rounded-full size-2.5 transition-all ${
                              lead.isStuck
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-emerald-500 hover:bg-emerald-600'
                            }`}
                          />

                          {/* Tooltip */}
                          {hoveredId === lead.id && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap bg-gray-900 dark:bg-gray-800 text-white text-xs rounded px-2 py-1 z-50 pointer-events-none">
                              <p className="font-medium">{lead.company_name}</p>
                              <p className="text-gray-300">
                                {lead.daysInStage}d in {stage.label}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Overflow badge */}
                      {overflow && (
                        <div className="inline-flex items-center justify-center size-6 rounded-full bg-gray-300 dark:bg-muted text-xs font-bold text-gray-700 dark:text-foreground">
                          +{stageLeads.length - MAX_VISIBLE}
                        </div>
                      )}
                    </div>

                    {/* Stage status indicator */}
                    {stageLeads.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-muted-foreground mt-1">
                        {isActiveStage(stage.value as PipelineStage)
                          ? `${stageLeads.filter(l => l.isStuck).length} stuck`
                          : 'final'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 text-xs text-gray-600 dark:text-muted-foreground border-t border-gray-100 dark:border-border pt-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-emerald-400" style={{ animationDuration: '2s' }} />
                <div className="relative rounded-full size-2 bg-emerald-500" />
              </div>
              <span>Active (updated within 2 weeks)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-ping opacity-75 bg-red-400" style={{ animationDuration: '2s' }} />
                <div className="relative rounded-full size-2 bg-red-500" />
              </div>
              <span>Stuck (no activity for 2+ weeks)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
