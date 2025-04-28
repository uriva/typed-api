type Endpoint<Input, Output> = { input: Input; output: Output };

type ApiDefinition = Record<string, Endpoint<unknown, unknown>>;

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
      console.error(response.status);
      return Promise.reject(await response.text());
    }
    return await response.json();
  };

export const typedApiHandler = async <
  User,
  EPs extends ApiDefinition,
  Key extends keyof EPs,
>(
  endpoints: TypedApiImplementation<User, EPs>,
  verifyToken: (token: string) => Promise<User>,
  { token, payload, endpoint }: {
    endpoint: Key;
    token: string;
    payload: EPs[Key]["input"];
  },
): Promise<EPs[Key]["output"]> => {
  const activeUser = await verifyToken(token);
  const ep = endpoints[endpoint];
  if (!ep) throw new Error("No endpoint found");
  return ep(activeUser, payload);
};
