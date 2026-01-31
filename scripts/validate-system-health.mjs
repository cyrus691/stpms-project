const baseUrl = process.env.BASE_URL || "http://localhost:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const response = await fetch(`${baseUrl}/api/system-health`);
  assert(response.ok, `Request failed: ${response.status} ${response.statusText}`);

  const data = await response.json();
  assert(typeof data.score === "number", "score must be a number");
  assert(data.score >= 0 && data.score <= 100, "score must be between 0 and 100");
  assert(["operational", "degraded", "down"].includes(data.status), "status must be operational, degraded, or down");
  assert(typeof data.statusLabel === "string", "statusLabel must be a string");
  assert(Array.isArray(data.metrics), "metrics must be an array");
  assert(Array.isArray(data.trend), "trend must be an array");

  data.metrics.forEach((metric, index) => {
    assert(typeof metric.label === "string", `metrics[${index}].label must be a string`);
    assert(typeof metric.value === "string", `metrics[${index}].value must be a string`);
    assert(["good", "warning", "critical"].includes(metric.status), `metrics[${index}].status invalid`);
    assert(typeof metric.target === "string", `metrics[${index}].target must be a string`);
    assert(typeof metric.percentage === "number", `metrics[${index}].percentage must be a number`);
    assert(metric.percentage >= 0 && metric.percentage <= 100, `metrics[${index}].percentage must be 0-100`);
  });

  data.trend.forEach((point, index) => {
    assert(typeof point.label === "string", `trend[${index}].label must be a string`);
    assert(typeof point.score === "number", `trend[${index}].score must be a number`);
    assert(point.score >= 0 && point.score <= 100, `trend[${index}].score must be 0-100`);
  });

  console.log("System health API response is valid.");
}

main().catch((error) => {
  console.error("System health validation failed:", error.message);
  process.exit(1);
});