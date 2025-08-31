import type { z } from "zod/v4";

export const endpoint = <TInput, TOutput, TAuth extends boolean>(def: {
  input: TInput;
  output: TOutput;
  authRequired: TAuth;
}) => def;

export type ApiDefinition = Record<
  string,
  { input: z.ZodTypeAny; output: z.ZodTypeAny; authRequired: boolean }
>;

type AuthenticatedHandler<User, Input, Output> = (
  user: User,
  payload: Input,
) => Promise<Output>;
type UnauthenticatedHandler<Input, Output> = (
  payload: Input,
) => Promise<Output>;

type HandlerFor<User, Input, Output, AuthRequired extends boolean> =
  AuthRequired extends true ? AuthenticatedHandler<User, Input, Output>
    : UnauthenticatedHandler<Input, Output>;

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
    return response.status === 200
      ? response.json() as Promise<O>
      : Promise.reject(
        new Error(`HTTP ${response.status}: ${await response.text()}`),
      );
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
  const data =
    (parsed as { success: true; data: z.infer<Def[Key]["input"]> }).data;
  if (endpointDef.authRequired) {
    if (!("token" in req)) throw new Error("Token required");
    const user = await impl.authenticate(req.token);
    return (impl.handlers[req.endpoint] as AuthenticatedHandler<
      User,
      z.infer<Def[Key]["input"]>,
      z.infer<Def[Key]["output"]>
    >)(user, data);
  } else {
    return (impl.handlers[req.endpoint] as UnauthenticatedHandler<
      z.infer<Def[Key]["input"]>,
      z.infer<Def[Key]["output"]>
    >)(data);
  }
};
