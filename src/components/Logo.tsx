/**
 * The phaselaw brand glyph (the looping "infinity" mark) paired with the
 * "unredact" wordmark. The glyph path is the same one used in the favicon.
 */
export function BrandGlyph({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 42 40"
      fill="none"
      role="img"
      aria-label="phaselaw"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M39.74 24.47C41.05 23.07 41.71 21.54 41.71 20.01C41.71 18.5 41.07 15.76 37.05 13.42C36.31 12.99 35.38 12.95 34.58 13.41C31.51 15.19 26.44 16.25 21.01 16.25C11.22 16.25 5.23004 12.9 5.23004 11.08C5.23004 9.25999 11.22 5.90999 21.01 5.90999C21.81 5.90999 22.62 5.92999 23.41 5.97999C24.76 6.06999 25.93 5.01999 26.01 3.66999C26.09 2.30999 25.05 1.14999 23.7 1.06999C22.82 1.01999 21.91 0.98999 21.01 0.98999C7.42004 0.98999 0.300037 6.06999 0.300037 11.09C0.300037 12.62 0.970039 14.16 2.27004 15.55C2.26004 15.56 2.26004 15.56 2.25004 15.57C0.950038 16.96 0.290039 18.49 0.290039 20.02C0.290039 25.04 7.40004 30.12 21 30.12C27.31 30.12 32.22 29.03 35.67 27.35C36.4 27.92 36.78 28.48 36.78 28.94C36.78 30.76 30.79 34.11 21 34.11C20.19 34.11 19.38 34.09 18.6 34.04C17.25 33.96 16.08 35 16 36.35C15.92 37.71 16.96 38.87 18.31 38.95C19.19 39 20.09 39.03 21 39.03C34.59 39.03 41.71 33.95 41.71 28.93C41.71 27.39 41.04 25.86 39.74 24.47ZM21 25.18C11.21 25.18 5.22004 21.83 5.22004 20.01C5.22004 19.55 5.60004 19 6.32004 18.43C6.32004 18.43 6.33004 18.42 6.34004 18.41C9.79004 20.08 14.7 21.18 21.01 21.18C26.63 21.18 31.85 20.18 35.64 18.41C35.64 18.41 35.65 18.41 35.65 18.42C36.42 19.04 36.79 19.62 36.79 20.02C36.78 21.83 30.79 25.18 21 25.18Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Logo({className}: {className?: string}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <BrandGlyph className="h-7 w-7 text-brand-vermillion" />
      <span className="flex items-baseline gap-1.5 leading-none">
        <span className="text-xl font-bold tracking-tight">unredact</span>
        <span className="text-sm font-medium text-brand-ink/50">
          by phaselaw
        </span>
      </span>
    </span>
  )
}
