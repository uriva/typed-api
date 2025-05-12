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
// api.ts
import type { ApiImplementation } from "@uri/typed-api";

type MyApiDef = {
  getUser: {
    input: { id: string };
    output: { id: string; name: string };
    authRequired: false;
  };
  add: {
    input: { a: number; b: number };
    output: { sum: number };
    authRequired: false;
  };
};
```

### 2. Implement the server logic

```ts
// server.ts
import type { ApiImplementation } from "@uri/typed-api";
import type { MyApiDef } from "./api.ts";

const implementation: ApiImplementation<unknown, MyApiDef> = {
  authenticate: async () => Promise.resolve({}), // Not used since all endpoints are public
  handlers: {
    getUser: {
      handler: async (payload) => {
        return { id: payload.id, name: "Alice" };
      },
      authRequired: false,
    },
    add: {
      handler: async (payload) => {
        return { sum: payload.a + payload.b };
      },
      authRequired: false,
    },
  },
};

// To handle a request:
import { apiHandler } from "@uri/typed-api";
// Example usage (in a server route handler):
// const result = await apiHandler(implementation, { endpoint, token, payload });
```

### 3. Use the client (with full type safety)

```ts
// client.ts
import { apiClient } from "@uri/typed-api";
import type { MyApiDef } from "./api.ts";

const client = apiClient<MyApiDef>("http://localhost:3000");

// Example usage:
const user = await client("getUser", "", { id: "123" }); // { id: string, name: string }
const sumResult = await client("add", "", { a: 2, b: 3 }); // { sum: number }
```
