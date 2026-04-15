import { memo, useCallback, useState } from "react";
import { LuFileText, LuSearch, LuTarget, LuTrash, LuUser } from "react-icons/lu";
import { Form } from "react-router";
import { ConfirmDelete } from "~/components/ConfirmDelete";
import { Hyperlink } from "~/components/Hyperlink";
import { New } from "~/components/New";
import { Button } from "~/components/ui/button";
import { Heading } from "~/components/ui/heading";
import { HStack } from "~/components/ui/stack";
import { path } from "~/utils/path";
import { formatDate } from "~/utils/date";
import type { BallooningDiagram } from "../ballooning.types";

type BallooningTableProps = {
  data: BallooningDiagram[];
  count: number;
  /** Mirrors Carbon list `?search=` (Table SearchFilter). */
  search: string | null;
};

function EmployeeAvatar() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border bg-muted text-xs font-medium">
      DU
    </span>
  );
}

const BallooningTable = memo(
  ({ data, count, search }: BallooningTableProps) => {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<BallooningDiagram | null>(null);

    const openDelete = useCallback((row: BallooningDiagram) => {
      setSelected(row);
      setDeleteOpen(true);
    }, []);

    return (
      <>
        <div className="flex h-full min-h-0 flex-1 flex-col border-b bg-background">
          <div className="flex h-[50px] flex-shrink-0 items-center justify-between border-b px-4">
            <HStack spacing={2}>
              <LuTarget className="h-4 w-4 text-muted-foreground" />
              <Heading size="h4">Ballooning Diagrams</Heading>
              <span className="text-sm text-muted-foreground">({count})</span>
            </HStack>
            <HStack spacing={3}>
              <Form method="get" className="flex items-center gap-2">
                <input type="hidden" name="limit" value="100" />
                <input type="hidden" name="offset" value="0" />
                <div className="relative">
                  <LuSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    name="search"
                    defaultValue={search ?? ""}
                    placeholder="Search"
                    className="h-9 w-48 rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Button variant="secondary" type="submit" size="sm">
                  Search
                </Button>
              </Form>
              <New label="Ballooning Diagram" to={path.to.newBallooningDiagram} />
            </HStack>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-[1] border-b bg-card">
                <tr>
                  <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <LuUser className="h-3.5 w-3.5" />
                      Created By
                    </span>
                  </th>
                  <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <LuFileText className="h-3.5 w-3.5" />
                      Created At
                    </span>
                  </th>
                  <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <LuUser className="h-3.5 w-3.5" />
                      Updated By
                    </span>
                  </th>
                  <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <LuFileText className="h-3.5 w-3.5" />
                      Updated At
                    </span>
                  </th>
                  <th className="h-10 w-14 px-4 text-right text-xs font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-4 py-2">
                      <Hyperlink to={path.to.ballooningDiagram(row.id)}>
                        {row.name}
                      </Hyperlink>
                    </td>
                    <td className="px-4 py-2">
                      <EmployeeAvatar />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-4 py-2">
                      <EmployeeAvatar />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(row.updatedAt)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        leftIcon={<LuTrash className="h-4 w-4" />}
                        onClick={() => openDelete(row)}
                        aria-label="Delete diagram"
                      />
                    </td>
                  </tr>
                ))}
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-muted-foreground"
                    >
                      No ballooning diagrams yet. Create one to get started.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        {deleteOpen && selected ? (
          <ConfirmDelete
            action={path.to.deleteBallooningDiagram(selected.id)}
            isOpen
            onCancel={() => {
              setDeleteOpen(false);
              setSelected(null);
            }}
            onSubmit={() => {
              setDeleteOpen(false);
              setSelected(null);
            }}
            name={selected.name}
            text="Are you sure you want to delete this ballooning diagram?"
          />
        ) : null}
      </>
    );
  }
);

BallooningTable.displayName = "BallooningTable";
export default BallooningTable;
