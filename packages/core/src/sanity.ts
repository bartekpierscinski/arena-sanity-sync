import { createClient } from "@sanity/client";

export function createSanityClient(opts: {
  projectId: string;
  dataset: string;
  token: string;
  apiVersion?: string;
}) {
  const client = createClient({
    ...opts,
    useCdn: false,
    apiVersion: opts.apiVersion ?? "2024-05-15",
  });
  return client;
}
