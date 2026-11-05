import { defineConfig } from "vitest/config";

// Юніт-тести лише для чистої логіки (без Phaser і DOM): стани гравця, рівень, згода, якість тощо.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
