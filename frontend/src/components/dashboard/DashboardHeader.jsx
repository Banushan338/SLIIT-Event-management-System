import { Filter, Plus, Search } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { resolveMediaUrl } from '@/lib/api'

function initials(name = '') {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U'
  )
}

export function DashboardHeader({
  search,
  onSearchChange,
  type,
  onTypeChange,
  category,
  onCategoryChange,
  onCreateEvent,
  user,
}) {
  return (
    <div className="mb-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/70 p-4 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <Input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search events..."
            className="pl-9"
          />
        </div>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger className="min-w-[170px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={onCategoryChange}>
          <SelectTrigger className="min-w-[170px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="work">Work</SelectItem>
            <SelectItem value="sports">Sports</SelectItem>
            <SelectItem value="social">Social</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 justify-self-end">
          {onCreateEvent ? (
            <Button variant="gradient" onClick={onCreateEvent}>
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          ) : null}
          <Avatar className="h-9 w-9 border border-[var(--color-border)]">
            <AvatarImage src={resolveMediaUrl(user?.profileImage)} />
            <AvatarFallback>{initials(user?.username || user?.name || '')}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  )
}
