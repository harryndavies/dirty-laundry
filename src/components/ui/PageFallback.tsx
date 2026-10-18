import { Spinner } from './Spinner'

/** Shown for the moment it takes to fetch a page's code. */
export function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  )
}
