import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'
import {
  errorMessage,
  useCategories,
  useReorderCategories,
  useUpdateCategory,
} from '@/api'
import type { Category } from '@/types'
import { formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Badge, Skeleton } from '@/components/ui/badge'
import { ConfirmDialog, PageHeader } from '@/components/shared'

function SortableCategoryRow({
  category,
  onEdit,
  onToggleStatus,
}: {
  category: Category
  onEdit: (c: Category) => void
  onToggleStatus: (c: Category) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'bg-[#EFF6FF] dark:bg-[#172554] opacity-90 shadow-md' : 'hover:bg-[var(--surface-hover)]'}
    >
      <td className="px-3.5 py-3.5 w-14">
        <button
          type="button"
          aria-label={`Drag to reorder ${category.name}`}
          {...attributes}
          {...listeners}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#475569] hover:bg-[#EFF6FF] hover:text-[#1E3A8A] cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-3.5 py-3.5 text-xs font-mono text-[var(--text-secondary)]">
        #{category.sort_order}
      </td>
      <td className="px-3.5 py-3.5">
        <div className="font-semibold text-[#1E3A8A] dark:text-[#DBEAFE]">{category.name}</div>
        {category.description && (
          <div className="text-xs text-[var(--text-secondary)]">{category.description}</div>
        )}
      </td>
      <td className="px-3.5 py-3.5 tabular-nums font-medium">{category.item_count ?? 0}</td>
      <td className="px-3.5 py-3.5">
        <Badge variant={category.is_active ? 'active' : 'inactive'}>
          {category.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="px-3.5 py-3.5 text-xs text-[var(--text-secondary)]">
        {formatDate(category.created_at)}
      </td>
      <td className="px-3.5 py-3.5 text-right">
        <div className="inline-flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(category)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant={category.is_active ? 'destructive' : 'secondary'}
            size="sm"
            onClick={() => onToggleStatus(category)}
          >
            <Power className="h-3.5 w-3.5" />
            {category.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function CategoriesPage() {
  const navigate = useNavigate()
  const { data: categories, isLoading } = useCategories()
  const reorder = useReorderCategories()
  const updateCategory = useUpdateCategory()
  const [toggleTarget, setToggleTarget] = useState<Category | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const list = categories ?? []

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = list.findIndex((c) => c.id === active.id)
    const newIndex = list.findIndex((c) => c.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const nextOrder = arrayMove(list, oldIndex, newIndex).map((c) => c.id)
    try {
      await reorder.mutateAsync(nextOrder)
      toast.success('Updated category display order')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return
    try {
      await updateCategory.mutateAsync({
        id: toggleTarget.id,
        is_active: !toggleTarget.is_active,
      })
      toast.success(
        toggleTarget.is_active
          ? `Deactivated "${toggleTarget.name}"`
          : `Activated "${toggleTarget.name}"`,
      )
      setToggleTarget(null)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        subtitle="Drag to reorder categories. Display order drives monthly reports and Excel workbook ordering."
        actions={
          <Button asChild>
            <Link to="/categories/new">
              <Plus className="h-4 w-4" />
              + Add category
            </Link>
          </Button>
        }
      />

      <div className="app-card">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-divider)] text-[12px] font-semibold uppercase tracking-wider text-[#475569]">
                    <th className="px-3.5 py-3 w-14">Order</th>
                    <th className="px-3.5 py-3">#</th>
                    <th className="px-3.5 py-3">Name</th>
                    <th className="px-3.5 py-3">Items</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3">Created</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <SortableContext
                  items={list.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="divide-y divide-[var(--border-divider)]">
                    {list.map((cat) => (
                      <SortableCategoryRow
                        key={cat.id}
                        category={cat}
                        onEdit={(c) => navigate(`/categories/${c.id}/edit`)}
                        onToggleStatus={setToggleTarget}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
        title={
          toggleTarget?.is_active
            ? `Deactivate "${toggleTarget.name}"?`
            : `Activate "${toggleTarget?.name}"?`
        }
        description={
          toggleTarget?.is_active
            ? 'Deactivating a category hides it from new expense forms while preserving all historical expense records and reports.'
            : 'Activating this category makes it selectable again on new expense forms.'
        }
        confirmLabel={toggleTarget?.is_active ? 'Deactivate category' : 'Activate category'}
        destructive={Boolean(toggleTarget?.is_active)}
        loading={updateCategory.isPending}
        onConfirm={handleConfirmToggle}
      />
    </div>
  )
}

