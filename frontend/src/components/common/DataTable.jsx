import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function DataTable({
  columns = [],
  rows = [],
  keyField = 'id',
  emptyMessage = 'No records available.',
  className,
}) {
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-[var(--color-border)]', className)}>
      <Table className="min-w-full">
        <TableHeader className="bg-[var(--color-muted)]/35">
          <TableRow className="hover:bg-transparent">
            {columns.map((column, colIndex) => (
              <TableHead
                key={column.key != null ? String(column.key) : `col-h-${colIndex}`}
                className={cn(column.headerClassName)}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row, rowIndex) => (
              <TableRow key={row[keyField] ?? rowIndex}>
                {columns.map((column, colIndex) => (
                  <TableCell
                    key={
                      column.key != null
                        ? `${String(column.key)}-${rowIndex}`
                        : `col-${rowIndex}-${colIndex}`
                    }
                    className={cn('text-sm', column.cellClassName)}
                  >
                    {column.render
                      ? column.render(row, rowIndex)
                      : row[column.key] ?? (
                          <span className="text-[var(--color-muted-foreground)]">-</span>
                        )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={Math.max(columns.length, 1)}
                className="py-12 text-center text-sm text-[var(--color-muted-foreground)]"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function StatusBadge({ status }) {
  const normalized = String(status || 'unknown').toLowerCase()
  const variant =
    normalized === 'approved' || normalized === 'active' || normalized === 'completed'
      ? 'success'
      : normalized === 'pending'
        ? 'warning'
        : normalized === 'rejected' || normalized === 'inactive' || normalized === 'locked'
          ? 'destructive'
          : 'info'

  return (
    <Badge variant={variant} className="capitalize">
      {normalized.replace(/([A-Z])/g, ' $1')}
    </Badge>
  )
}
