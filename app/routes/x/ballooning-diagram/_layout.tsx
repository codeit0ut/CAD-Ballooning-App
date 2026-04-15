import type { MetaFunction } from "react-router";
import { Outlet } from "react-router";

export const meta: MetaFunction = () => {
  return [{ title: "Ballooning Diagram" }];
};

export default function BallooningDiagramLayout() {
  return <Outlet />;
}
