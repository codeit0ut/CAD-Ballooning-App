import type { InputHTMLAttributes } from "react";

export function Hidden(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="hidden" {...props} />;
}
