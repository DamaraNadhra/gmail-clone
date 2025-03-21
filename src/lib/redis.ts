// lib/redis.ts
import { Redis } from "@upstash/redis";

declare global {
  var redis: Redis | undefined;
}

let redisClient: Redis;

if (process.env.NODE_ENV === "development") {
  if (!global.redis) {
    global.redis = new Redis({
      url: "https://aware-badger-28104.upstash.io",
      token: "AW3IAAIjcDEyNmJmYTQ1N2YzYTg0MjU1ODY1NTk1NWUzOTU3MTcyNnAxMA",
    });
  }
  redisClient = global.redis;
} else {
  if (process.env.NODE_ENV !== "test") {
    redisClient = new Redis({
      url: "https://aware-badger-28104.upstash.io",
      token: "AW3IAAIjcDEyNmJmYTQ1N2YzYTg0MjU1ODY1NTk1NWUzOTU3MTcyNnAxMA",
    });
  } else {
    redisClient = undefined as unknown as Redis;
  }
}

export default redisClient;
