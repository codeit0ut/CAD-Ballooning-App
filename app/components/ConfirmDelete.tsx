import { Form } from "react-router";
import { Button } from "~/components/ui/button";

export function ConfirmDelete({
  action,
  isOpen,
  onCancel,
  onSubmit,
  name,
  text
}: {
  action: string;
  isOpen: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  name: string;
  text: string;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Delete</h3>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        <p className="mt-1 text-sm font-medium">{name}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Form method="post" action={action} onSubmit={onSubmit}>
            <Button variant="primary" type="submit" className="bg-destructive text-destructive-foreground hover:opacity-90">
              Delete
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
