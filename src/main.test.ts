import { assertEquals, assertRejects } from "jsr:@std/assert";
import { apiHandler, type ApiImplementation } from "./main.ts";

type User = { id: string };

type MyApiDef = {
  authEndpoint: {
    input: { msg: string };
    output: { reply: string };
    authRequired: true;
  };
  publicEndpoint: {
    input: { msg: string };
    output: { reply: string };
    authRequired: false;
  };
};

const implementation: ApiImplementation<User, MyApiDef> = {
  authenticate: (token: string): Promise<User> => {
    if (token === "valid") return Promise.resolve({ id: "user1" });
    return Promise.reject(new Error("Invalid token"));
  },
  handlers: {
    authEndpoint: {
      handler: (user: User, payload: { msg: string }) => {
        if (!user) throw new Error("No user");
        return Promise.resolve({ reply: `auth: ${user.id} - ${payload.msg}` });
      },
      authRequired: true,
    },
    publicEndpoint: {
      handler: (payload: { msg: string }) => {
        return Promise.resolve({ reply: `public: ${payload.msg}` });
      },
      authRequired: false,
    },
  },
};

Deno.test("authenticated endpoint with valid token", async () => {
  const { reply } = await apiHandler(
    implementation,
    { endpoint: "authEndpoint", token: "valid", payload: { msg: "hello" } },
  );
  assertEquals(reply, "auth: user1 - hello");
});

Deno.test("authenticated endpoint with invalid token rejects", async () => {
  await assertRejects(
    async () => {
      await apiHandler(
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
    implementation,
    { endpoint: "publicEndpoint", token: "", payload: { msg: "world" } },
  );
  assertEquals(reply, "public: world");
});
