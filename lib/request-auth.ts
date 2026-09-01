const USER_ID_HEADER = "oai-authenticated-user-id";

export function authenticatedUserId(request: Request) {
  const value = request.headers.get(USER_ID_HEADER)?.trim();
  return value ? value.slice(0, 200) : null;
}
