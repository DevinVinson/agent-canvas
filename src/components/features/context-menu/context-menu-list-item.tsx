import { forwardRef } from "react";
import { cn } from "#/utils/utils";
import { dropdownMenuRowForegroundClassName } from "#/utils/dropdown-classes";

interface ContextMenuListItemProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled"
> {
  testId?: string;
  isDisabled?: boolean;
}

export const ContextMenuListItem = forwardRef<
  HTMLButtonElement,
  React.PropsWithChildren<ContextMenuListItemProps>
>(function ContextMenuListItem(
  {
    children,
    testId,
    onClick,
    isDisabled,
    className,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      data-testid={testId || "context-menu-list-item"}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        dropdownMenuRowForegroundClassName,
        "text-nowrap",
        className,
      )}
    >
      {children}
    </button>
  );
});
