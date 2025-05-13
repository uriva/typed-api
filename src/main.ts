import type { z } from "zod";

export const endpoint = <TInput, TOutput, TAuth extends boolean>(def: {
  input: TInput;
  output: TOutput;
  authRequired: TAuth;
}) => def;

export type ApiDefinition = Record<
  string,
  { input: z.ZodTypeAny; output: z.ZodTypeAny; authRequired: boolean }
>;

type HandlerFor<User, Input, Output, AuthRequired extends boolean> =
  AuthRequired extends true ? (user: User, payload: Input) => Promise<Output>
    : (payload: Input) => Promise<Output>;

export type ApiImplementation<User, Def extends ApiDefinition> = {
  authenticate: (token: string) => Promise<User>;
  handlers: {
    [K in keyof Def]: HandlerFor<
      User,
      z.infer<Def[K]["input"]>,
      z.infer<Def[K]["output"]>,
      Def[K]["authRequired"]
    >;
  };
};

export const httpCommunication =
  (serverUrl: string) => async <T, O>(params: T): Promise<O> => {
    const response = await fetch(serverUrl, {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (response.status !== 200) {
      return Promise.reject(await response.text());
    }
    return response.json() as Promise<O>;
  };

export const apiClient = <EPs extends ApiDefinition>(
  communicateWithServer: <input, output>(input: input) => Promise<output>,
  _apiDefinition: EPs,
) =>
<E extends keyof EPs>(
  params: EPs[E] extends { authRequired: true }
    ? { endpoint: E; token: string; payload: z.infer<EPs[E]["input"]> }
    : { endpoint: E; payload: z.infer<EPs[E]["input"]> },
): Promise<z.infer<EPs[E]["output"]>> =>
  communicateWithServer<
    typeof params,
    z.infer<EPs[E]["output"]>
  >(params);

export const apiHandler = async <
  User,
  Def extends ApiDefinition,
  Key extends keyof Def,
>(
  def: Def,
  impl: ApiImplementation<User, Def>,
  req: Def[Key] extends { authRequired: true } ? {
      endpoint: Key;
      token: string;
      payload: z.infer<Def[Key]["input"]>;
    }
    : {
      endpoint: Key;
      payload: z.infer<Def[Key]["input"]>;
    },
): Promise<z.infer<Def[Key]["output"]>> => {
  const endpointDef = def[req.endpoint];
  if (!endpointDef) throw new Error("No endpoint found");
  // Validate input
  const parsed = endpointDef.input.safeParse(req.payload);
  if (!parsed.success) {
    throw new Error("Invalid input: " + parsed.error.message);
  }
  const data = (parsed as { success: true; data: unknown }).data;
  if (endpointDef.authRequired) {
    if (!("token" in req)) throw new Error("Token required");
    const user = await impl.authenticate(req.token);
    // Auth endpoint: handler expects (user, payload)
    return (impl.handlers[req.endpoint] as (
      user: User,
      payload: typeof data,
    ) => Promise<unknown>)(user, data);
  } else {
    // Public endpoint: handler expects (payload)
    return (impl.handlers[req.endpoint] as (
      payload: typeof data,
    ) => Promise<unknown>)(data);
  }
};
