const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  const response = await fetch(`${baseUrl}/api/system-health`);
  if (!response.ok) {
    console.error(`Request failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error("System health check failed:", error);
  process.exit(1);
});