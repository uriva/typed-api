type EndpointDefinition<Input, Output, AuthRequired extends boolean> = {
  input: Input;
  output: Output;
  authRequired: AuthRequired;
};

type ApiDefinition = Record<
  string,
  EndpointDefinition<unknown, unknown, boolean>
>;

type HandlerFor<User, Input, Output, AuthRequired extends boolean> =
  AuthRequired extends false ? (payload: Input) => Promise<Output>
    : (user: User, payload: Input) => Promise<Output>;

export type ApiImplementation<User, Definition extends ApiDefinition> = {
  authenticate: (token: string) => Promise<User>;
  handlers: {
    [K in keyof Definition]: {
      handler: HandlerFor<
        User,
        Definition[K]["input"],
        Definition[K]["output"],
        Definition[K]["authRequired"]
      >;
      authRequired: Definition[K]["authRequired"];
    };
  };
};

export const apiClient =
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

export const apiHandler = async <
  User,
  Def extends ApiDefinition,
  Key extends keyof Def,
>(
  { handlers, authenticate }: ApiImplementation<User, Def>,
  { token, payload, endpoint }: {
    endpoint: Key;
    token: string;
    payload: Def[Key]["input"];
  },
): Promise<Def[Key]["output"]> => {
  const endpointObj = handlers[endpoint];
  if (!endpointObj) throw new Error("No endpoint found");
  if (endpointObj.authRequired) {
    return endpointObj.handler(await authenticate(token), payload);
  } else {
    // @ts-expect-error this is a bit of a hack to get around the fact that we don't know if the endpoint is auth required or not
    return endpointObj.handler(payload);
  }
};
