import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ErrorBoundary } from "./error-boundary";

interface SafeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SafeDialog({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
  footer,
}: SafeDialogProps) {
  // Reset any potential state issues on open/close
  const dialogKey = React.useMemo(() => `dialog-${open ? 'open' : 'closed'}-${Date.now()}`, [open]);

  return (
    <ErrorBoundary fallback={<div>Dialog failed to load</div>}>
      <Dialog key={dialogKey} open={open} onOpenChange={onOpenChange}>
        <DialogContent className={className}>
          {(title || description) && (
            <DialogHeader>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}