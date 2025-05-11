export type Endpoint<Input, Output, AuthRequired extends boolean = true> = {
  input: Input;
  output: Output;
  authRequired?: AuthRequired;
};

type ApiDefinition = Record<string, Endpoint<unknown, unknown, boolean>>;

type Handler<User, EPs extends ApiDefinition, E extends keyof EPs> = (
  user: User,
  payload: EPs[E]["input"],
) => Promise<EPs[E]["output"]>;

export type TypedApiImplementation<User, EPs extends ApiDefinition> = {
  [E in keyof EPs]: Handler<User, EPs, E>;
};

export const typedApiClient =
  <EPs extends ApiDefinition>(serverUrl: string) =>
  async <E extends keyof EPs>(
    endpoint: E,
    token: string,
    payload: EPs[E]["input"],
  ): Promise<EPs[E]["output"]> => {
    const response = await fetch(serverUrl, {
      method: "POST",
      body: JSON.stringify({ payload, endpoint, token }),
    });
    if (response.status !== 200) {
      return Promise.reject(await response.text());
    }
    return await response.json();
  };

type HandlerFor<User, Input, Output, AuthRequired extends boolean> =
  AuthRequired extends true ? (user: User, payload: Input) => Promise<Output>
    : (payload: Input) => Promise<Output>;

export type ApiDefinitionObject<
  User,
  Def extends Record<
    string,
    { input: unknown; output: unknown; authRequired: boolean }
  >,
> = {
  [K in keyof Def]: {
    handler: HandlerFor<
      User,
      Def[K]["input"],
      Def[K]["output"],
      Def[K]["authRequired"]
    >;
    authRequired: Def[K]["authRequired"];
  };
};

export const typedApiHandler = async <
  User,
  Def extends Record<
    string,
    { input: unknown; output: unknown; authRequired: boolean }
  >,
  Key extends keyof Def,
>(
  endpoints: ApiDefinitionObject<User, Def>,
  verifyToken: (token: string) => Promise<User>,
  { token, payload, endpoint }: {
    endpoint: Key;
    token: string;
    payload: Def[Key]["input"];
  },
): Promise<Def[Key]["output"]> => {
  const endpointObj = endpoints[endpoint];
  if (!endpointObj) throw new Error("No endpoint found");
  if (endpointObj.authRequired) {
    const user = await verifyToken(token);
    // @ts-ignore: handler expects user for auth endpoints
    return endpointObj.handler(user, payload);
  } else {
    // @ts-ignore: handler expects only payload for public endpoints
    return endpointObj.handler(payload);
  }
};
