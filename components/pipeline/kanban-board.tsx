'use client'

import { useState, useTransition, useMemo, useCallback, memo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { toast } from 'sonner'
import { updateClientStageAction } from '@/app/actions/clients'
import { PIPELINE_STAGES } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import type { Database, PipelineStage } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']
type ClientsByStage = Record<PipelineStage, Client[]>

interface KanbanBoardProps {
  initialClients: Client[]
}

export function KanbanBoard({ initialClients }: KanbanBoardProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const clientsByStage = useMemo(() => {
    return PIPELINE_STAGES.reduce<ClientsByStage>((acc, stage) => {
      acc[stage.value] = clients.filter(c => c.pipeline_stage === stage.value)
      return acc
    }, {} as ClientsByStage)
  }, [clients])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const client = clients.find(c => c.id === event.active.id)
    if (client) setActiveClient(client)
  }, [clients])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveClient(null)
    const { active, over } = event
    if (!over) return

    const clientId = active.id as string
    const overId = over.id as string

    // Determine target stage: could be dropping on a column or on another card
    const isColumn = PIPELINE_STAGES.some(s => s.value === overId)
    const targetStage = isColumn
      ? (overId as PipelineStage)
      : (clients.find(c => c.id === overId)?.pipeline_stage ?? null)

    if (!targetStage) return

    const client = clients.find(c => c.id === clientId)
    if (!client || client.pipeline_stage === targetStage) return

    // Optimistic update
    setClients(prev =>
      prev.map(c => c.id === clientId ? { ...c, pipeline_stage: targetStage } : c)
    )

    startTransition(async () => {
      const result = await updateClientStageAction(clientId, { pipeline_stage: targetStage })
      if (result.error) {
        toast.error(result.error)
        // Revert
        setClients(prev =>
          prev.map(c => c.id === clientId ? { ...c, pipeline_stage: client.pipeline_stage } : c)
        )
      }
    })
  }, [clients])

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 h-full">
        {PIPELINE_STAGES.map(stage => (
          <KanbanColumn
            key={stage.value}
            stage={stage}
            clients={clientsByStage[stage.value] ?? []}
          />
        ))}
      </div>
      <DragOverlay>
        {activeClient && <ClientCard client={activeClient} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}

const KanbanColumn = memo(function KanbanColumn({
  stage,
  clients,
}: {
  stage: (typeof PIPELINE_STAGES)[number]
  clients: Client[]
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.value,
    data: { type: 'column' },
  })

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors ${
        isOver ? 'bg-primary/5 border-primary/30' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-xs font-semibold text-foreground">{stage.label}</span>
        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {clients.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2 p-2 min-h-[120px]">
          {clients.map(client => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
})

const ClientCard = memo(function ClientCard({ client, isDragging }: { client: Client; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: client.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-lg bg-card ring-1 ring-foreground/10 p-3 cursor-grab active:cursor-grabbing select-none transition-shadow ${
        isDragging || isSortableDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium mt-0.5">
          {getInitials(client.company_name)}
        </div>
        <div className="min-w-0">
          <Link
            href={`/clients/${client.id}`}
            className="text-xs font-medium hover:text-primary truncate block"
            onClick={e => e.stopPropagation()}
          >
            {client.company_name}
          </Link>
          <p className="text-xs text-muted-foreground truncate">{client.contact_name}</p>
          {client.industry && (
            <p className="text-xs text-muted-foreground mt-0.5">{client.industry}</p>
          )}
        </div>
      </div>
      {client.tags && client.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {client.tags.slice(0, 2).map(tag => (
            <span key={tag} className="rounded-full bg-muted px-1.5 py-px text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
})
