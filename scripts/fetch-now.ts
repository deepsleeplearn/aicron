import { refreshAllSourcesWithBaseline } from "../src/lib/refresh-runner";

async function main() {
  const result = await refreshAllSourcesWithBaseline();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
