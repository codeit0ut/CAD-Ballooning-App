import { redirect, type LoaderFunctionArgs } from "react-router";
import { path } from "~/utils/path";

export function loader(_args: LoaderFunctionArgs) {
  throw redirect(path.to.ballooningDiagrams);
}
