# @uri/typed-api

A TypeScript-first library for building and consuming APIs with full type safety
between client and server.

## Motivation & Benefits

- **Type Safety Everywhere:** Your API contract is a single source of truth,
  enforced by TypeScript on both client and server. No more mismatched types or
  runtime surprises.
- **Eliminate Discrepancies:** Prevent bugs caused by differences between client
  and server contracts—errors are caught at compile time.
- **No Boilerplate:** Define your API once and get both server and client
  implementations automatically.
- **Local-like Development:** Interact with remote APIs as if they were local
  functions, with full autocompletion and type checking.
- **Save Time Debugging:** Spend less time tracking down subtle bugs—type errors
  are surfaced instantly during development.
- **Productive:** No need to write repetitive fetch/request code.
- **Reliable:** Changes in the API contract are caught at compile time.

## Example Usage

### 1. Define your API contract (this file is shared by client & server)

```ts
import { z, type ZodTypeAny } from "zod";
import { endpoint } from "./src/main.ts";

export const api = {
  authEndpoint: endpoint({
    input: z.object({ msg: z.string() }),
    output: z.object({ reply: z.string() }),
    authRequired: true,
  }),
  publicEndpoint: endpoint({
    input: z.object({ msg: z.string() }),
    output: z.object({ reply: z.string() }),
    authRequired: false,
  }),
};
```

### 2. Implement the server logic

```ts
import { api } from "./api_contract.ts"; // or wherever you defined your contract
import { type ApiImplementation } from "./src/main.ts";

type User = { id: string };

const implementation: ApiImplementation<User, typeof api> = {
  authenticate: async (token: string) => {
    if (token === "valid") return { id: "user1" };
    throw new Error("Invalid token");
  },
  handlers: {
    authEndpoint: async (user, payload) => {
      // user is guaranteed to be present
      return { reply: `auth: ${user.id} - ${payload.msg}` };
    },
    publicEndpoint: async (payload) => {
      return { reply: `public: ${payload.msg}` };
    },
  },
};
```

### 3. Use the client (with full type safety)

```ts
import { apiClient } from "./src/main.ts";
import { api } from "./api_contract.ts"; // or wherever you defined your contract

// Example transport function (replace with your actual server communication logic)
const transport = async (input: unknown): Promise<unknown> => {
  // For demo: call a local handler, or use fetch for real server
  // return await fetch("/api", { method: "POST", body: JSON.stringify(input) }).then(r => r.json());
  throw new Error("Not implemented");
};

const client = apiClient(transport, api);

// Authenticated endpoint
client({ endpoint: "authEndpoint", token: "valid", payload: { msg: "hello" } })
  .then((res) => console.log(res.reply)); // Fully typed: { reply: string }

// Public endpoint
client({ endpoint: "publicEndpoint", payload: { msg: "world" } })
  .then((res) => console.log(res.reply)); // Fully typed: { reply: string }
```
