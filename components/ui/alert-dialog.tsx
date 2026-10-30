"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

// shadcn/ui's Radix composition, styled with IntheraNotes' existing theme tokens.
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export function AlertDialogOverlay({
  className = "",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={`alert-dialog-overlay ${className}`}
      {...props}
    />
  );
}

export function AlertDialogContent({
  className = "",
  container,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content> & {
  container?: React.ComponentProps<
    typeof AlertDialogPrimitive.Portal
  >["container"];
}) {
  return (
    <AlertDialogPortal container={container}>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={`alert-dialog-content ${className}`}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
}
export function AlertDialogHeader({
  className = "",
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={`alert-dialog-header ${className}`}
      {...props}
    />
  );
}
export function AlertDialogFooter({
  className = "",
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={`alert-dialog-footer ${className}`}
      {...props}
    />
  );
}
export function AlertDialogTitle({
  className = "",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={`alert-dialog-title ${className}`}
      {...props}
    />
  );
}
export function AlertDialogDescription({
  className = "",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={`alert-dialog-description ${className}`}
      {...props}
    />
  );
}
export function AlertDialogAction({
  className = "",
  variant = "default",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action> & {
  variant?: "default" | "destructive";
}) {
  return (
    <AlertDialogPrimitive.Action
      type="button"
      data-slot="alert-dialog-action"
      data-variant={variant}
      className={`btn primary alert-dialog-action ${className}`}
      {...props}
    />
  );
}
export function AlertDialogCancel({
  className = "",
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      type="button"
      data-slot="alert-dialog-cancel"
      className={`btn secondary alert-dialog-cancel ${className}`}
      {...props}
    />
  );
}
