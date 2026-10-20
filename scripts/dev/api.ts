import { errorSchema } from "./contracts.ts";

export async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const error = errorSchema.parse(await response.json());
    throw new Error(error.error);
  }
  return response;
}
