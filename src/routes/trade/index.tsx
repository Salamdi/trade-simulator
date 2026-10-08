import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/trade/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex items-center justify-center h-screen px-4 text-center text-[var(--sea-ink-soft)] text-sm">
      This page is currently undergoing maintenance. Please check back soon.
    </div>
  )
}
