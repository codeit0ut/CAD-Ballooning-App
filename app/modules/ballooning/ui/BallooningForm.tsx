import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle
} from "~/components/ui/drawer";
import { Hidden } from "~/components/Form";
import { Input } from "~/components/ui/input";
import { path } from "~/utils/path";
import { Form, useActionData, useNavigation } from "react-router";

type BallooningFormProps = {
  initialValues: {
    id?: string;
    name: string;
    drawingNumber?: string;
    revision?: string;
  };
  onClose: () => void;
};

export default function BallooningForm({
  initialValues,
  onClose
}: BallooningFormProps) {
  const isEditing = Boolean(initialValues.id);
  const actionData = useActionData() as { errors?: Record<string, string> } | undefined;
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <Form
          method="post"
          action={
            isEditing
              ? path.to.ballooningDiagram(initialValues.id!)
              : path.to.newBallooningDiagram
          }
          className="flex h-full max-h-[85dvh] flex-col"
        >
          <DrawerHeader>
            <DrawerTitle>
              {isEditing ? "Edit Ballooning Diagram" : "New Ballooning Diagram"}
            </DrawerTitle>
          </DrawerHeader>
          <DrawerBody>
            <div className="flex flex-col gap-4">
              {isEditing ? <Hidden name="id" value={initialValues.id} /> : null}
              <Input
                name="name"
                label="Name"
                placeholder="e.g. Part 1234 Rev A"
                defaultValue={initialValues.name}
                required
              />
              {actionData?.errors?.name ? (
                <p className="text-sm text-destructive">{actionData.errors.name}</p>
              ) : null}
              <Input
                name="drawingNumber"
                label="Drawing Number"
                placeholder="e.g. DWG-1234"
                defaultValue={initialValues.drawingNumber ?? ""}
              />
              <Input
                name="revision"
                label="Revision"
                placeholder="e.g. A"
                defaultValue={initialValues.revision ?? ""}
              />
            </div>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isDisabled={busy}>
              {isEditing ? "Save" : "Create"}
            </Button>
          </DrawerFooter>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
