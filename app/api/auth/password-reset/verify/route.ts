export async function POST(request: Request) {
  void request;
  return new Response(
    JSON.stringify({ message: "Password reset is handled by the administrator." }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  );
}
