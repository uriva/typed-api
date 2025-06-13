import { assertEquals, assertRejects } from "jsr:@std/assert";
import { z } from "zod/v4";
import {
  apiClient,
  apiHandler,
  type ApiImplementation,
  endpoint,
} from "./main.ts";

type User = { id: string };

const api = {
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

const implementation: ApiImplementation<User, typeof api> = {
  authenticate: (token: string): Promise<User> => {
    if (token === "valid") return Promise.resolve({ id: "user1" });
    return Promise.reject(new Error("Invalid token"));
  },
  handlers: {
    authEndpoint: (user: User, payload: { msg: string }) => {
      if (!user) throw new Error("No user");
      return Promise.resolve({ reply: `auth: ${user.id} - ${payload.msg}` });
    },
    publicEndpoint: (payload: { msg: string }) => {
      return Promise.resolve({ reply: `public: ${payload.msg}` });
    },
  },
};

Deno.test("authenticated endpoint with valid token", async () => {
  const { reply } = await apiHandler(
    api,
    implementation,
    { endpoint: "authEndpoint", token: "valid", payload: { msg: "hello" } },
  );
  assertEquals(reply, "auth: user1 - hello");
});

Deno.test("authenticated endpoint with invalid token rejects", async () => {
  await assertRejects(
    async () => {
      await apiHandler(
        api,
        implementation,
        { endpoint: "authEndpoint", token: "bad", payload: { msg: "fail" } },
      );
    },
    Error,
    "Invalid token",
  );
});

Deno.test("unauthenticated endpoint (authRequired: false)", async () => {
  const { reply } = await apiHandler(
    api,
    implementation,
    { endpoint: "publicEndpoint", payload: { msg: "world" } },
  );
  assertEquals(reply, "public: world");
});

// Create a direct function that mimics server communication
const transport = async <I, O>(input: I): Promise<O> => {
  // Use apiHandler directly to simulate server logic
  // @ts-expect-error: TypeScript can't infer the conditional type here, but it's safe for test
  return await apiHandler(api, implementation, input);
};

Deno.test("apiClient works for authenticated and public endpoints", async () => {
  const client = apiClient(transport, api);

  // Authenticated endpoint
  const authResult = await client({
    endpoint: "authEndpoint",
    token: "valid",
    payload: { msg: "from client" },
  });
  assertEquals(authResult.reply, "auth: user1 - from client");

  // Public endpoint
  const publicResult = await client({
    endpoint: "publicEndpoint",
    payload: { msg: "from client" },
  });
  assertEquals(publicResult.reply, "public: from client");

  // Authenticated endpoint with invalid token should reject
  await assertRejects(
    async () => {
      await client({
        endpoint: "authEndpoint",
        token: "bad",
        payload: { msg: "fail" },
      });
    },
    Error,
    "Invalid token",
  );
});
