import { forwardRef } from "react";
import type { LucideProps } from "lucide-react";

export const WorktreeMainDirectoryIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 10 22.1"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...props}
    >
      <circle cx="5" cy="18.1" r="3" />
      <path d="M9 8.37l-4 4L1 8.37" />
      <path d="M5 11.3V1" />
    </svg>
  ),
);

WorktreeMainDirectoryIcon.displayName = "WorktreeMainDirectoryIcon";
