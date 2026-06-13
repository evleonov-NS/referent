import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

type ErrorAlertProps = {
  message: string;
  className?: string;
};

export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className={className}>
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
